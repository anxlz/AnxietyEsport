import Link from 'next/link';
import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  mapMatchFromRow,
  mapTaskFromRow,
  type MatchRow,
  type TaskRow,
  type RosterMemberRow,
  type RosterRow,
} from '@/lib/types/database-rows';

interface RosterMemberJoinedRow extends RosterMemberRow {
  rosters: Pick<RosterRow, 'id' | 'name' | 'game' | 'region'> | null;
}

const TYPE_LABEL: Record<string, string> = {
  text: 'Text',
  video: 'Video',
  document: 'Document',
  link: 'Link',
};

export default async function PlayerOverviewPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: memberRow } = await supabase
    .from('roster_members')
    .select('*, rosters(id, name, game, region)')
    .eq('user_id', user.id)
    .maybeSingle<RosterMemberJoinedRow>();

  const rosterId = memberRow?.roster_id ?? null;

  const [{ data: upcomingRows }, { data: taskRows }, { count: unreadCount }] = await Promise.all([
    rosterId
      ? supabase
          .from('matches')
          .select('*')
          .eq('roster_id', rosterId)
          .eq('status', 'scheduled')
          .order('match_date', { ascending: true })
          .limit(3)
          .returns<MatchRow[]>()
      : Promise.resolve({ data: [] as MatchRow[] }),
    supabase
      .from('tasks')
      .select('*')
      .contains('assigned_to', [user.id])
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(3)
      .returns<TaskRow[]>(),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false),
  ]);

  const upcomingMatches = (upcomingRows ?? []).map(mapMatchFromRow);
  const tasks = (taskRows ?? []).map(mapTaskFromRow);
  const nextMatch = upcomingMatches[0] ?? null;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="space-y-6 md:col-span-2">
        <section className="rounded-card border border-white/[0.07] bg-surface-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-[#FAFAFA]">Next match</h2>
          {nextMatch ? (
            <div>
              <p className="text-lg font-semibold text-[#FAFAFA]">vs {nextMatch.opponentName}</p>
              <p className="mt-1 text-sm text-[rgba(250,250,250,0.5)]">
                {[
                  nextMatch.tournament,
                  nextMatch.matchDate ? new Date(nextMatch.matchDate).toLocaleString() : null,
                  nextMatch.region,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <Link href="/dashboard/player/calendar" className="mt-2 inline-block text-sm text-brand hover:underline">
                View details →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-[rgba(250,250,250,0.4)]">No upcoming matches scheduled.</p>
          )}
        </section>

        <section className="rounded-card border border-white/[0.07] bg-surface-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-[#FAFAFA]">Open tasks</h2>
          {tasks.length === 0 ? (
            <p className="text-sm text-[rgba(250,250,250,0.4)]">No open tasks right now.</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between rounded-input border border-white/[0.07] bg-surface-elevated px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-[#FAFAFA]">{task.title}</p>
                      <span className="rounded-badge bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-[rgba(250,250,250,0.5)]">
                        {TYPE_LABEL[task.type ?? 'text']}
                      </span>
                    </div>
                    {task.dueDate ? (
                      <p className="text-xs text-[rgba(250,250,250,0.4)]">
                        Due {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    ) : null}
                  </div>
                  <Link href="/dashboard/player/tasks" className="text-xs text-brand hover:underline">
                    View →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-card border border-white/[0.07] bg-surface-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-[#FAFAFA]">My roster</h2>
          {memberRow?.rosters ? (
            <div>
              <p className="text-sm text-[#FAFAFA]">{memberRow.rosters.name}</p>
              <p className="text-xs text-[rgba(250,250,250,0.5)]">
                {memberRow.rosters.game}
                {memberRow.rosters.region ? ` · ${memberRow.rosters.region}` : ''}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[rgba(250,250,250,0.4)]">Not assigned to a roster yet.</p>
          )}
        </section>

        <section className="rounded-card border border-white/[0.07] bg-surface-card p-5 text-center">
          <p className="text-2xl font-bold text-[#FAFAFA]">{unreadCount ?? 0}</p>
          <p className="mt-1 text-xs text-[rgba(250,250,250,0.5)]">unread notifications</p>
        </section>
      </div>
    </div>
  );
}
