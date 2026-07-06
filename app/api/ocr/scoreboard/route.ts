// app/api/ocr/scoreboard/route.ts
//
// CODM scoreboard OCR pipeline — mirrors the Discord bot's implementation:
//   1. Receive multipart image upload
//   2. Primary: Gemini 2.5 Flash (vision + AI parsing in one step)
//   3. Fallback: Groq Llama-3.2-90b-vision (if Gemini fails or is unavailable)
//   4. Return structured ParsedScoreboard JSON
//
// Both providers receive the image as base64 with the same prompt so the
// response shape is always identical — the manager's scoreboard confirm table
// doesn't need to care which provider served the request.

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import type { ParsedScoreboard, ParsedScoreboardPlayer } from '@/lib/types/database';

// ---------------------------------------------------------------------------
// Shared prompt — identical to the Discord bot's OCR service prompt
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are analysing a CODM (Call of Duty: Mobile) competitive match scoreboard screenshot.

Rules:
- Extract ONLY the BLUE / left-side team players (our team, 5 players maximum).
- DO NOT extract the RED / right-side team (opponent) players.
- Copy player names EXACTLY as shown — preserve capitalisation, numbers, and special characters.
- objTime is the objective time in seconds. Convert mm:ss → total seconds (e.g. 1:23 → 83). Use 0 if not visible.
- mvp is true for exactly one player — the top performer (first place). All others are false.
- If a stat column is not visible or blank, use 0.
- Return ONLY a raw JSON array — no markdown fences, no explanation, no extra keys.

Output schema (array of exactly 5 objects, or fewer if the team has fewer players visible):
[
  {
    "playerName": "string",
    "kills": 0,
    "deaths": 0,
    "assists": 0,
    "objTime": 0,
    "mvp": false
  }
]`;

// ---------------------------------------------------------------------------
// Gemini 2.5 Flash (primary)
// ---------------------------------------------------------------------------
async function parseWithGemini(
  base64: string,
  mimeType: string,
  apiKey: string
): Promise<ParsedScoreboardPlayer[]> {
  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: SYSTEM_PROMPT },
        ],
      },
    ],
    config: { temperature: 0.1, maxOutputTokens: 2048 },
  });

  const text = (response.text ?? '').replace(/```json|```/g, '').trim();
  const parsed: unknown = JSON.parse(text);

  if (!Array.isArray(parsed)) throw new Error('Gemini: response is not an array');
  return parsed as ParsedScoreboardPlayer[];
}

// ---------------------------------------------------------------------------
// Groq Llama-3.2-90b-vision (fallback)
// ---------------------------------------------------------------------------
async function parseWithGroq(
  base64: string,
  mimeType: string,
  apiKey: string
): Promise<ParsedScoreboardPlayer[]> {
  const client = new Groq({ apiKey });

  const completion = await client.chat.completions.create({
    model: 'llama-3.2-90b-vision-preview',
    temperature: 0.1,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          { type: 'text', text: SYSTEM_PROMPT },
        ],
      },
    ],
  });

  const text = (completion.choices[0]?.message?.content ?? '').replace(/```json|```/g, '').trim();
  const parsed: unknown = JSON.parse(text);

  if (!Array.isArray(parsed)) throw new Error('Groq: response is not an array');
  return parsed as ParsedScoreboardPlayer[];
}

// ---------------------------------------------------------------------------
// Normalise — clamp negatives, ensure mvp is boolean, coerce number fields
// ---------------------------------------------------------------------------
function normalise(players: ParsedScoreboardPlayer[]): ParsedScoreboardPlayer[] {
  return players.map((player, index) => ({
    playerName: String(player.playerName ?? `Player ${index + 1}`),
    kills: Math.max(0, Number(player.kills) || 0),
    deaths: Math.max(0, Number(player.deaths) || 0),
    assists: Math.max(0, Number(player.assists) || 0),
    objTime: Math.max(0, Number(player.objTime) || 0),
    mvp: Boolean(player.mvp),
  }));
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest): Promise<NextResponse> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const imageFile = formData.get('image') as File | null;
  if (!imageFile) {
    return NextResponse.json({ error: 'No image provided. Send a multipart field named "image".' }, { status: 400 });
  }

  const googleApiKey = process.env.GOOGLE_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!googleApiKey && !groqApiKey) {
    return NextResponse.json(
      { error: 'OCR service not configured — set GOOGLE_API_KEY and/or GROQ_API_KEY in .env.local' },
      { status: 503 }
    );
  }

  const bytes = await imageFile.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const mimeType = imageFile.type || 'image/png';

  let players: ParsedScoreboardPlayer[] | null = null;
  const errors: string[] = [];

  // Try Gemini first
  if (googleApiKey) {
    try {
      const raw = await parseWithGemini(base64, mimeType, googleApiKey);
      players = normalise(raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Gemini: ${message}`);
      console.warn('[OCR] Gemini failed, trying Groq fallback:', message);
    }
  }

  // Groq fallback
  if (!players && groqApiKey) {
    try {
      const raw = await parseWithGroq(base64, mimeType, groqApiKey);
      players = normalise(raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Groq: ${message}`);
      console.error('[OCR] Groq fallback also failed:', message);
    }
  }

  if (!players) {
    return NextResponse.json(
      { error: 'All OCR providers failed', details: errors },
      { status: 502 }
    );
  }

  const result: ParsedScoreboard = { players };
  return NextResponse.json(result);
}
