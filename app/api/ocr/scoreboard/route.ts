import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import type { ParsedScoreboard } from '@/lib/types/database';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const imageFile = formData.get('image') as File | null;

  if (!imageFile) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OCR service not configured' }, { status: 503 });
  }

  const bytes = await imageFile.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const mimeType = imageFile.type || 'image/png';

  const client = new GoogleGenAI({ apiKey });

  const prompt = `You are analysing a CODM (Call of Duty Mobile) in-game scoreboard screenshot.
Extract ONLY the BLUE TEAM players (5 players). DO NOT extract red team players.
DO NOT modify any player names — extract exactly as shown.

Return a JSON array of exactly 5 objects, nothing else:
[
  {
    "playerName": "exact name",
    "kills": 0,
    "deaths": 0,
    "assists": 0,
    "objTime": 0,
    "mvp": false
  }
]

objTime is the objective time in seconds (convert mm:ss to total seconds).
mvp is true for the highest-performing player (1st place), false for all others.
If a value is not visible, use 0. Return ONLY the JSON array.`;

  let text = '';
  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ inlineData: { mimeType, data: base64 } }, { text: prompt }],
        },
      ],
      config: { temperature: 0.1, maxOutputTokens: 2048 },
    });
    text = response.text ?? '';
  } catch {
    return NextResponse.json({ error: 'OCR request failed' }, { status: 502 });
  }

  const cleaned = text.replace(/```json|```/g, '').trim();

  let players: ParsedScoreboard['players'];
  try {
    players = JSON.parse(cleaned);
    if (!Array.isArray(players)) {
      throw new Error('Not an array');
    }
  } catch {
    return NextResponse.json({ error: 'Could not parse scoreboard data', raw: text }, { status: 422 });
  }

  const result: ParsedScoreboard = { players };
  return NextResponse.json(result);
}
