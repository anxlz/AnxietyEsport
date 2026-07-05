'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { mapRosterFromRow, type RosterRow } from '@/lib/types/database-rows';
import type { Roster, CodmMode, ParsedScoreboardPlayer } from '@/lib/types/database';
import { MatchMapCard } from '@/components/match/MatchMapCard';
import { toast } from '@/lib/toast';

const MAP_NAMES = [
  'Hacienda',
  'Coastal',
  'Crossroads Strike',
  'Arsenal',
  'Slums',
  'Skidrow',
  'Summit',
  'Highrise',
  'Rust',
  'Hackney Yard',
  'Pine',
  'Scrapyard',
  'Raid',
  'Terminal',
  'Standoff',
] as const;

const MODES: CodmMode[] = ['Hardpoint', 'Search & Destroy', 'Control'];
const REGIONS = ['EU', 'NA', 'APAC', 'MENA'] as const;

interface MapEntry {
  id: string;
  mapName: string;
  mode: CodmMode | '';
  vodUrl: string;
}

interface NewMatchForm {
  opponentName: string;
  tournament: string;
  matchDate: string;
  week: string;
  day: string;
  region: string;
  rosterId: string;
  maps: MapEntry[];
  scoreboardImageFile: File | null;
  parsedPlayers: ParsedScoreboardPlayer[];
  scoreboardUploading: boolean;
  scoreboardError: string | null;
}

function emptyForm(): NewMatchForm {
  return {
    opponentName: '',
    tournament: '',
    matchDate: '',
    week: '',
    day: '',
    region: '',
    rosterId: '',
    maps: [],
    scoreboardImageFile: null,
    parsedPlayers: [],
    scoreboardUploading: false,
    scoreboardError: null,
  };
}

function generateLocalId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const STEP_LABELS = ['Match details', 'Map builder', 'Scoreboard', 'Review'];

interface SortableMapRowProps {
  map: MapEntry;
  index: number;
  onChange: (id: string, patch: Partial<MapEntry>) => void;
  onRemove: (id: string) => void;
}

function SortableMapRow({ map, index, onChange, onRemove }: SortableMapRowProps): ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: map.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-input border border-white/[0.07] bg-surface-elevated p-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-[rgba(250,250,250,0.4)] hover:text-white"
        aria-label="Drag to reorder"
      >
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
          <path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01" />
        </svg>
      </button>

      <span className="w-5 shrink-0 text-center text-xs text-[rgba(250,250,250,0.4)]">{index + 1}</span>

      <select
        value={map.mapName}
        onChange={(e) => onChange(map.id, { mapName: e.target.value })}
        className="flex-1 rounded-input border border-white/[0.1] bg-[#0D0D10] px-2 py-1.5 text-sm text-[#FAFAFA] focus:border-brand focus:outline-none"
      >
        <option value="">Select map</option>
        {MAP_NAMES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <select
        value={map.mode}
        onChange={(e) => onChange(map.id, { mode: e.target.value as CodmMode | '' })}
        className="w-44 rounded-input border border-white/[0.1] bg-[#0D0D10] px-2 py-1.5 text-sm text-[#FAFAFA] focus:border-brand focus:outline-none"
      >
        <option value="">Select mode</option>
        {MODES.map((mode) => (
          <option key={mode} value={mode}>
            {mode}
          </option>
        ))}
      </select>

      <Input
        value={map.vodUrl}
        onChange={(e) => onChange(map.id, { vodUrl: e.target.value })}
        placeholder="YouTube link"
        className="w-44"
      />

      <button
        type="button"
        onClick={() => onRemove(map.id)}
        className="text-[rgba(250,250,250,0.4)] hover:text-red-400"
        aria-label="Remove map"
      >
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
          <path d="M4 7h16" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M6 7l1 13h10l1-13" />
          <path d="M9 7V4h6v3" />
        </svg>
      </button>
    </div>
  );
}

export default function NewMatchPage(): ReactElement {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [step, setStep] = useState<number>(0);
  const [form, setForm] = useState<NewMatchForm>(emptyForm());
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    async function loadRosters(): Promise<void> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('rosters')
        .select('*')
        .eq('manager_id', user.id)
        .eq('active', true)
        .returns<RosterRow[]>();

      const loaded = (data ?? []).map(mapRosterFromRow);
      setRosters(loaded);
      if (loaded.length === 1 && loaded[0]) {
        setForm((prev) => ({ ...prev, rosterId: loaded[0]!.id }));
      }
    }
    loadRosters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm<K extends keyof NewMatchForm>(key: K, value: NewMatchForm[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addMap(): void {
    if (form.maps.length >= 5) return;
    setForm((prev) => ({
      ...prev,
      maps: [...prev.maps, { id: generateLocalId(), mapName: '', mode: '', vodUrl: '' }],
    }));
  }

  function updateMap(id: string, patch: Partial<MapEntry>): void {
    setForm((prev) => ({
      ...prev,
      maps: prev.maps.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }

  function removeMap(id: string): void {
    setForm((prev) => ({ ...prev, maps: prev.maps.filter((m) => m.id !== id) }));
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setForm((prev) => {
      const oldIndex = prev.maps.findIndex((m) => m.id === active.id);
      const newIndex = prev.maps.findIndex((m) => m.id === over.id);
      return { ...prev, maps: arrayMove(prev.maps, oldIndex, newIndex) };
    });
  }

  function handleFileSelect(file: File | null): void {
    setForm((prev) => ({ ...prev, scoreboardImageFile: file, scoreboardError: null }));
  }

  async function extractScoreboard(): Promise<void> {
    if (!form.scoreboardImageFile) return;

    setForm((prev) => ({ ...prev, scoreboardUploading: true, scoreboardError: null }));

    try {
      const body = new FormData();
      body.append('image', form.scoreboardImageFile);

      const res = await fetch('/api/ocr/scoreboard', { method: 'POST', body });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errJson?.error ?? 'Could not analyse scoreboard');
      }

      const result = (await res.json()) as { players: ParsedScoreboardPlayer[] };
      setForm((prev) => ({
        ...prev,
        parsedPlayers: result.players,
        scoreboardUploading: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not analyse scoreboard';
      setForm((prev) => ({
        ...prev,
        scoreboardUploading: false,
        scoreboardError: message,
      }));
      toast.error(message);
    }
  }

  function updateParsedPlayer(index: number, patch: Partial<ParsedScoreboardPlayer>): void {
    setForm((prev) => ({
      ...prev,
      parsedPlayers: prev.parsedPlayers.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  }

  function validateStep(currentStep: number): boolean {
    if (currentStep === 0) {
      if (!form.opponentName.trim() || !form.rosterId) {
        const message = 'Opponent name and roster are required.';
        setStepError(message);
        toast.error(message);
        return false;
      }
    }
    if (currentStep === 1) {
      if (form.maps.length === 0) {
        const message = 'Add at least one map.';
        setStepError(message);
        toast.error(message);
        return false;
      }
      if (form.maps.some((m) => !m.mapName || !m.mode)) {
        const message = 'Every map needs a name and a mode.';
        setStepError(message);
        toast.error(message);
        return false;
      }
    }
    setStepError(null);
    return true;
  }

  function goNext(): void {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }

  function goBack(): void {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handlePublish(): Promise<void> {
    setPublishing(true);
    setPublishError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          roster_id: form.rosterId,
          created_by: user.id,
          opponent_name: form.opponentName,
          tournament: form.tournament || null,
          match_date: form.matchDate ? new Date(form.matchDate).toISOString() : null,
          week: form.week ? parseInt(form.week, 10) : null,
          day: form.day ? parseInt(form.day, 10) : null,
          region: form.region || null,
          status: 'scheduled',
          parsed_scoreboard: form.parsedPlayers.length > 0 ? { players: form.parsedPlayers } : null,
        })
        .select()
        .single();

      if (matchError || !match) throw new Error(matchError?.message ?? 'Could not create match');

      if (form.maps.length > 0) {
        const { error: mapsError } = await supabase.from('match_maps').insert(
          form.maps.map((map, index) => ({
            match_id: match.id,
            map_name: map.mapName,
            mode: map.mode || null,
            order_num: index + 1,
            vod_url: map.vodUrl || null,
            status: 'pending',
          }))
        );
        if (mapsError) throw new Error(mapsError.message);
      }

      if (form.parsedPlayers.length > 0) {
        await supabase.from('player_stats').insert(
          form.parsedPlayers.map((p) => ({
            match_id: match.id,
            user_id: user.id, // placeholder mapping; real player linking happens once roster IGNs are matched
            kills: p.kills,
            deaths: p.deaths,
            assists: p.assists,
            obj_time: p.objTime,
            is_mvp: p.mvp,
            raw_data: p as unknown as Record<string, unknown>,
          }))
        );
      }

      const { data: members } = await supabase
        .from('roster_members')
        .select('user_id')
        .eq('roster_id', form.rosterId)
        .returns<{ user_id: string }[]>();

      if (members && members.length > 0) {
        await supabase.from('notifications').insert(
          members.map((member) => ({
            user_id: member.user_id,
            type: 'match_scheduled',
            title: 'New match scheduled',
            content: `vs ${form.opponentName}`,
            link: `/dashboard/manager/matches/${match.id}`,
            actor_id: user.id,
          }))
        );
      }

      router.push(`/dashboard/manager/matches/${match.id}`);
      toast.success('Match scheduled.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not publish match';
      setPublishError(message);
      toast.error(message);
      setPublishing(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-3xl"
    >
      <h1 className="mb-1 text-lg font-semibold text-[#FAFAFA]">New match</h1>
      <p className="mb-6 text-sm text-[rgba(250,250,250,0.5)]">{STEP_LABELS[step]}</p>

      <div className="mb-6 flex gap-2">
        {STEP_LABELS.map((label, i) => (
          <span
            key={label}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand' : 'bg-white/[0.08]'}`}
          />
        ))}
      </div>

      <div className="rounded-card border border-white/[0.07] bg-surface-card p-6">
        {step === 0 ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="rosterId">Roster</Label>
              <select
                id="rosterId"
                value={form.rosterId}
                onChange={(e) => updateForm('rosterId', e.target.value)}
                className="mt-1.5 w-full rounded-input border border-white/[0.1] bg-[#0D0D10] px-3 py-2 text-sm text-[#FAFAFA] focus:border-brand focus:outline-none"
              >
                <option value="">Select roster</option>
                {rosters.map((roster) => (
                  <option key={roster.id} value={roster.id}>
                    {roster.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="opponentName">Opponent name</Label>
              <Input
                id="opponentName"
                value={form.opponentName}
                onChange={(e) => updateForm('opponentName', e.target.value)}
                placeholder="Team name"
              />
            </div>

            <div>
              <Label htmlFor="tournament">Tournament name</Label>
              <Input
                id="tournament"
                value={form.tournament}
                onChange={(e) => updateForm('tournament', e.target.value)}
                placeholder="e.g. CODM Worlds Qualifier"
              />
            </div>

            <div>
              <Label htmlFor="matchDate">Match date &amp; time</Label>
              <Input
                id="matchDate"
                type="datetime-local"
                value={form.matchDate}
                onChange={(e) => updateForm('matchDate', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="week">Week</Label>
                <Input
                  id="week"
                  type="number"
                  value={form.week}
                  onChange={(e) => updateForm('week', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="day">Day</Label>
                <Input
                  id="day"
                  type="number"
                  value={form.day}
                  onChange={(e) => updateForm('day', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="region">Region</Label>
              <select
                id="region"
                value={form.region}
                onChange={(e) => updateForm('region', e.target.value)}
                className="mt-1.5 w-full rounded-input border border-white/[0.1] bg-[#0D0D10] px-3 py-2 text-sm text-[#FAFAFA] focus:border-brand focus:outline-none"
              >
                <option value="">Select region</option>
                {REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={form.maps.map((m) => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {form.maps.map((map, index) => (
                    <SortableMapRow
                      key={map.id}
                      map={map}
                      index={index}
                      onChange={updateMap}
                      onRemove={removeMap}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <Button type="button" variant="outline" onClick={addMap} disabled={form.maps.length >= 5}>
              + Add map
            </Button>

            {form.maps.length > 0 ? (
              <div className="flex flex-wrap gap-4 pt-2">
                {form.maps.map((map, index) =>
                  map.mapName ? (
                    <MatchMapCard
                      key={map.id}
                      mapName={map.mapName}
                      mode={map.mode || null}
                      teamScore={null}
                      oppScore={null}
                      status="pending"
                      mapImageUrl={null}
                      orderNum={index + 1}
                    />
                  ) : null
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="rounded-input border border-dashed border-white/[0.15] p-6 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                className="mx-auto block text-sm text-[rgba(250,250,250,0.6)]"
              />
              {form.scoreboardImageFile ? (
                <p className="mt-2 text-xs text-[rgba(250,250,250,0.5)]">
                  {form.scoreboardImageFile.name}
                </p>
              ) : null}
            </div>

            <Button
              type="button"
              onClick={extractScoreboard}
              disabled={!form.scoreboardImageFile || form.scoreboardUploading}
            >
              {form.scoreboardUploading ? 'Analysing scoreboard...' : 'Extract data'}
            </Button>

            {form.scoreboardError ? (
              <p className="text-sm text-red-400">{form.scoreboardError}</p>
            ) : null}

            {form.parsedPlayers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[rgba(250,250,250,0.5)]">
                      <th className="py-2">Player name</th>
                      <th className="py-2">Kills</th>
                      <th className="py-2">Deaths</th>
                      <th className="py-2">Assists</th>
                      <th className="py-2">Obj time (s)</th>
                      <th className="py-2">MVP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.parsedPlayers.map((player, index) => (
                      <tr key={index} className="border-t border-white/[0.05]">
                        <td className="py-1.5">
                          <Input
                            value={player.playerName}
                            onChange={(e) => updateParsedPlayer(index, { playerName: e.target.value })}
                          />
                        </td>
                        <td className="py-1.5">
                          <Input
                            type="number"
                            value={player.kills}
                            onChange={(e) => updateParsedPlayer(index, { kills: Number(e.target.value) })}
                          />
                        </td>
                        <td className="py-1.5">
                          <Input
                            type="number"
                            value={player.deaths}
                            onChange={(e) => updateParsedPlayer(index, { deaths: Number(e.target.value) })}
                          />
                        </td>
                        <td className="py-1.5">
                          <Input
                            type="number"
                            value={player.assists}
                            onChange={(e) => updateParsedPlayer(index, { assists: Number(e.target.value) })}
                          />
                        </td>
                        <td className="py-1.5">
                          <Input
                            type="number"
                            value={player.objTime}
                            onChange={(e) => updateParsedPlayer(index, { objTime: Number(e.target.value) })}
                          />
                        </td>
                        <td className="py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={player.mvp}
                            onChange={(e) => updateParsedPlayer(index, { mvp: e.target.checked })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setStep(3)}
              className="text-sm text-[rgba(250,250,250,0.5)] hover:text-white hover:underline"
            >
              Skip this step
            </button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="rounded-input border border-white/[0.07] bg-surface-elevated p-4">
              <p className="text-sm text-[#FAFAFA]">
                vs {form.opponentName || '—'} · {form.tournament || 'Friendly'}
              </p>
              <p className="text-xs text-[rgba(250,250,250,0.5)]">
                {form.matchDate ? new Date(form.matchDate).toLocaleString() : 'No date set'}
                {form.region ? ` · ${form.region}` : ''}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-[rgba(250,250,250,0.5)]">
                Maps ({form.maps.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {form.maps.map((map) => (
                  <span
                    key={map.id}
                    className="rounded-badge border border-white/[0.07] bg-surface-elevated px-2 py-1 text-xs text-[#FAFAFA]"
                  >
                    {map.mapName} · {map.mode}
                  </span>
                ))}
              </div>
            </div>

            {form.parsedPlayers.length > 0 ? (
              <p className="text-xs text-[rgba(250,250,250,0.5)]">
                Scoreboard: {form.parsedPlayers.length} players parsed
              </p>
            ) : (
              <p className="text-xs text-[rgba(250,250,250,0.5)]">No scoreboard data attached</p>
            )}

            {publishError ? <p className="text-sm text-red-400">{publishError}</p> : null}
          </div>
        ) : null}

        {stepError ? <p className="mt-3 text-sm text-red-400">{stepError}</p> : null}
      </div>

      <div className="mt-6 flex justify-between">
        <Button type="button" variant="outline" onClick={goBack} disabled={step === 0}>
          Back
        </Button>
        {step < STEP_LABELS.length - 1 ? (
          <Button type="button" onClick={goNext}>
            Next
          </Button>
        ) : (
          <Button type="button" onClick={handlePublish} disabled={publishing}>
            {publishing ? 'Publishing...' : 'Publish match'}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
