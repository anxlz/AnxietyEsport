import Link from 'next/link';
import type { ReactElement } from 'react';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapMatchFromRow, mapMatchMapFromRow, type MatchRow, type MatchMapRow } from '@/lib/types/database-rows';
import type { MatchStatus } from '@/lib/types/database';
import { MatchMapCard } from '@/components/match/MatchMapCard';

interface MatchDetailPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_BADGE: Record<MatchStatus, string> = {
  scheduled: 'bg-[#8943F9]/15 text-[#8943F9]',
  live: 'bg-yellow-500/15 text-yellow-400',
  completed: 'bg-green-500/15 text-green-400',
  cancelled: 'bg-red-500/15 text-red-400',
};

function formatObjTime(seconds: number): string {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps): Promise<ReactElement> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: matchRow } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single<MatchRow>();

  if (!matchRow) {
    notFound();
  }

  const match = mapMatchFromRow(matchRow);

  const { data: mapRows } = await supabase
    .from('match_maps')
    .select('*')
    .eq('match_id', id)
    .order('order_num', { ascending: true })
    .returns<MatchMapRow[]>();

  const maps = (mapRows ?? []).map(mapMatchMapFromRow);
  const players = match.parsedScoreboard?.players ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/manager/matches"
          className="text-sm text-[rgba(250,250,250,0.5)] hover:text-white"
        >
          ← Back to matches
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold text-[#FAFAFA]">vs {match.opponentName}</h1>
          <span className={`rounded-badge px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[match.status]}`}>
            {match.status}
          </span>
        </div>

        <p className="mt-1 text-sm text-[rgba(250,250,250,0.5)]">
          {[
            match.tournament,
            match.week ? `Week ${match.week}` : null,
            match.day ? `Day ${match.day}` : null,
            match.region,
            match.matchDate ? new Date(match.matchDate).toLocaleString() : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          {maps.length === 0 ? (
            <p className="text-sm text-[rgba(250,250,250,0.4)]">No maps added for this match.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {maps.map((map) => (
                <MatchMapCard
                  key={map.id}
                  mapName={map.mapName}
                  mode={map.mode}
                  teamScore={map.teamScore}
                  oppScore={map.oppScore}
                  status={map.status}
                  mapImageUrl={map.mapImageUrl}
                  orderNum={map.orderNum}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-card border border-white/[0.07] bg-surface-card p-5">
          <p className="text-sm text-[rgba(250,250,250,0.5)]">Score</p>
          <p className="mt-1 text-2xl font-bold text-[#FAFAFA]">
            {match.teamScore} – {match.oppScore}
          </p>
          <p className="mt-3 text-sm text-[rgba(250,250,250,0.5)]">Opponent</p>
          <p className="text-sm text-[#FAFAFA]">{match.opponentName}</p>

          <span
            title="Edit coming soon"
            className="mt-4 inline-block cursor-not-allowed rounded-input bg-brand px-3 py-1.5 text-xs font-medium text-white opacity-50"
          >
            Edit match
          </span>
        </div>
      </div>

      {players.length > 0 ? (
        <div className="overflow-hidden rounded-card border border-white/[0.07] bg-surface-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-left text-xs text-[rgba(250,250,250,0.5)]">
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Kills</th>
                <th className="px-4 py-3">Deaths</th>
                <th className="px-4 py-3">Assists</th>
                <th className="px-4 py-3">Obj Time</th>
                <th className="px-4 py-3">MVP</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => (
                <tr
                  key={index}
                  className={`border-b border-white/[0.05] last:border-b-0 ${player.mvp ? 'bg-brand/[0.06]' : ''}`}
                >
                  <td className="px-4 py-3 text-[#FAFAFA]">{player.playerName}</td>
                  <td className="px-4 py-3 text-[rgba(250,250,250,0.7)]">{player.kills}</td>
                  <td className="px-4 py-3 text-[rgba(250,250,250,0.7)]">{player.deaths}</td>
                  <td className="px-4 py-3 text-[rgba(250,250,250,0.7)]">{player.assists}</td>
                  <td className="px-4 py-3 text-[rgba(250,250,250,0.7)]">{formatObjTime(player.objTime)}</td>
                  <td className="px-4 py-3">{player.mvp ? '★' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
