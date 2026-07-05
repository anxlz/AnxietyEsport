import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  mapMatchFromRow,
  mapMatchMapFromRow,
  type MatchRow,
  type MatchMapRow,
  type RosterMemberRow,
} from '@/lib/types/database-rows';
import type { Match, MatchMap } from '@/lib/types/database';
import { PlayerMatchRow } from '@/components/dashboard/player/PlayerMatchRow';

type MatchWithMapsRow = MatchRow & { match_maps: MatchMapRow[] };

function monthYearLabel(isoDate: string | null): string {
  if (!isoDate) return 'Undated';
  return new Date(isoDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default async function PlayerCalendarPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: memberRow } = await supabase
    .from('roster_members')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<RosterMemberRow>();

  const rosterId = memberRow?.roster_id ?? null;

  const { data: matchRows } = rosterId
    ? await supabase
        .from('matches')
        .select('*, match_maps(*)')
        .eq('roster_id', rosterId)
        .order('match_date', { ascending: false })
        .returns<MatchWithMapsRow[]>()
    : { data: [] as MatchWithMapsRow[] };

  const grouped: { monthLabel: string; match: Match; maps: MatchMap[] }[] = (matchRows ?? []).map((row) => ({
    monthLabel: monthYearLabel(row.match_date),
    match: mapMatchFromRow(row),
    maps: (row.match_maps ?? []).map(mapMatchMapFromRow).sort((a, b) => a.orderNum - b.orderNum),
  }));

  const groupsByMonth = grouped.reduce<Record<string, typeof grouped>>((acc, item) => {
    const bucket = acc[item.monthLabel] ?? [];
    bucket.push(item);
    acc[item.monthLabel] = bucket;
    return acc;
  }, {});

  const monthLabels = Object.keys(groupsByMonth);

  return (
    <div className="space-y-8">
      {monthLabels.length === 0 ? (
        <p className="text-sm text-[rgba(250,250,250,0.4)]">No matches scheduled yet.</p>
      ) : (
        monthLabels.map((label) => (
          <div key={label}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[rgba(250,250,250,0.4)]">
              {label}
            </h2>
            <div className="space-y-2">
              {(groupsByMonth[label] ?? []).map(({ match, maps }) => (
                <PlayerMatchRow key={match.id} match={match} maps={maps} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
