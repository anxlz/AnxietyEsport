import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { StatsCharts, type PlayerStatData } from '@/components/dashboard/player/StatsCharts';

interface PlayerStatWithMatchRow {
  id: string;
  match_id: string;
  user_id: string;
  kills: number;
  deaths: number;
  assists: number;
  obj_time: number;
  points: number;
  is_mvp: boolean;
  matches: { opponent_name: string; match_date: string | null; tournament: string | null } | null;
}

export default async function PlayerStatsPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: statRows } = await supabase
    .from('player_stats')
    .select('*, matches(opponent_name, match_date, tournament)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .returns<PlayerStatWithMatchRow[]>();

  const stats: PlayerStatData[] = (statRows ?? []).map((row, index) => ({
    matchLabel: row.matches ? `vs ${row.matches.opponent_name}` : `Match ${index + 1}`,
    kills: row.kills,
    deaths: row.deaths,
    kd: row.deaths === 0 ? row.kills : Number((row.kills / row.deaths).toFixed(2)),
    assists: row.assists,
    objTime: row.obj_time,
    points: row.points,
    isMvp: row.is_mvp,
  }));

  return <StatsCharts stats={stats} />;
}
