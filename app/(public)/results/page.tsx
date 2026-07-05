import type { ReactElement } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  mapRosterFromRow,
  mapMatchFromRow,
  mapMatchMapFromRow,
  type RosterRow,
  type MatchRow,
  type MatchMapRow,
} from '@/lib/types/database-rows';
import { MatchMapCard } from '@/components/match/MatchMapCard';

export default async function ResultsPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();

  const { data: matchRows } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'completed')
    .order('match_date', { ascending: false })
    .returns<MatchRow[]>();

  const matches = (matchRows ?? []).map(mapMatchFromRow);
  const matchIds = matches.map((match) => match.id);

  const [{ data: rosterRows }, { data: mapRows }] = await Promise.all([
    supabase.from('rosters').select('*').returns<RosterRow[]>(),
    matchIds.length > 0
      ? supabase.from('match_maps').select('*').in('match_id', matchIds).order('order_num', { ascending: true }).returns<MatchMapRow[]>()
      : Promise.resolve({ data: [] as MatchMapRow[] }),
  ]);

  const rosterNameById = new Map((rosterRows ?? []).map(mapRosterFromRow).map((roster) => [roster.id, roster.name]));
  const maps = (mapRows ?? []).map(mapMatchMapFromRow);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-[#FAFAFA] md:text-4xl">Results</h1>
      <p className="mt-2 text-[rgba(250,250,250,0.55)]">Completed matches across every Anxiety Esports roster.</p>

      {matches.length === 0 ? (
        <p className="mt-10 text-sm text-[rgba(250,250,250,0.4)]">No completed matches yet.</p>
      ) : (
        <div className="mt-10 space-y-8">
          {matches.map((match) => {
            const won = match.teamScore > match.oppScore;
            const matchMaps = maps.filter((map) => map.matchId === match.id);

            return (
              <div key={match.id} className="rounded-card border border-white/[0.07] bg-[#111114] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#FAFAFA]">
                      {rosterNameById.get(match.rosterId) ?? 'Anxiety Esports'} vs {match.opponentName}
                    </p>
                    <p className="text-sm text-[rgba(250,250,250,0.5)]">
                      {match.tournament ?? 'Scrim'}
                      {match.matchDate ? ` · ${new Date(match.matchDate).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <span
                    className={
                      won
                        ? 'rounded-badge bg-green-500/10 px-2.5 py-1 text-sm font-semibold text-green-400'
                        : 'rounded-badge bg-red-500/10 px-2.5 py-1 text-sm font-semibold text-red-400'
                    }
                  >
                    {match.teamScore}–{match.oppScore}
                  </span>
                </div>

                {matchMaps.length > 0 ? (
                  <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
                    {matchMaps.map((map) => (
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
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
