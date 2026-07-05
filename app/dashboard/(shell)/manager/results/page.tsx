import Link from 'next/link';
import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapRosterFromRow, mapMatchFromRow, type RosterRow, type MatchRow } from '@/lib/types/database-rows';

export default async function ManagerResultsPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: rosterRows } = await supabase
    .from('rosters')
    .select('*')
    .eq('manager_id', user.id)
    .returns<RosterRow[]>();

  const rosters = (rosterRows ?? []).map(mapRosterFromRow);
  const rosterIds = rosters.map((roster) => roster.id);
  const rosterNameById = new Map(rosters.map((roster) => [roster.id, roster.name]));

  const { data: matchRows } =
    rosterIds.length > 0
      ? await supabase
          .from('matches')
          .select('*')
          .in('roster_id', rosterIds)
          .eq('status', 'completed')
          .order('match_date', { ascending: false })
          .returns<MatchRow[]>()
      : { data: [] as MatchRow[] };

  const matches = (matchRows ?? []).map(mapMatchFromRow);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-[#FAFAFA]">Results</h1>

      {matches.length === 0 ? (
        <p className="text-sm text-[rgba(250,250,250,0.4)]">No completed matches yet.</p>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const won = match.teamScore > match.oppScore;
            const players = match.parsedScoreboard?.players ?? [];

            return (
              <div key={match.id} className="rounded-card border border-white/[0.07] bg-surface-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#FAFAFA]">vs {match.opponentName}</p>
                    <p className="text-xs text-[rgba(250,250,250,0.5)]">
                      {rosterNameById.get(match.rosterId) ?? '—'}
                      {match.tournament ? ` · ${match.tournament}` : ''}
                      {match.matchDate ? ` · ${new Date(match.matchDate).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        won
                          ? 'rounded-badge bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400'
                          : 'rounded-badge bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400'
                      }
                    >
                      {match.teamScore}–{match.oppScore}
                    </span>
                    <Link href={`/dashboard/manager/matches/${match.id}`} className="text-xs text-brand hover:underline">
                      Full scoreboard →
                    </Link>
                  </div>
                </div>

                {players.length > 0 ? (
                  <div className="mt-3 overflow-hidden rounded-input border border-white/[0.05]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.05] text-left text-[rgba(250,250,250,0.5)]">
                          <th className="px-3 py-2">Player</th>
                          <th className="px-3 py-2">K</th>
                          <th className="px-3 py-2">D</th>
                          <th className="px-3 py-2">A</th>
                          <th className="px-3 py-2">MVP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.map((player, index) => (
                          <tr key={index} className={player.mvp ? 'bg-brand/[0.06]' : ''}>
                            <td className="px-3 py-2 text-[#FAFAFA]">{player.playerName}</td>
                            <td className="px-3 py-2 text-[rgba(250,250,250,0.7)]">{player.kills}</td>
                            <td className="px-3 py-2 text-[rgba(250,250,250,0.7)]">{player.deaths}</td>
                            <td className="px-3 py-2 text-[rgba(250,250,250,0.7)]">{player.assists}</td>
                            <td className="px-3 py-2">{player.mvp ? '★' : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
