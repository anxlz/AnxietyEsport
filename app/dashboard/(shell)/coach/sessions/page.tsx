import Link from 'next/link';
import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapMeetingRequestFromRow, type MeetingRequestRow } from '@/lib/types/database-rows';
import type { MeetingStatus } from '@/lib/types/database';

const STATUS_BADGE: Record<MeetingStatus, string> = {
  pending: 'bg-[#8943F9]/15 text-[#8943F9]',
  approved: 'bg-green-500/15 text-green-400',
  rejected: 'bg-red-500/15 text-red-400',
  rescheduled: 'bg-amber-500/15 text-amber-400',
};

export default async function CoachSessionsPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: requestRows } = await supabase
    .from('meeting_requests')
    .select('*')
    .eq('requester_id', user.id)
    .order('requested_date', { ascending: false })
    .returns<MeetingRequestRow[]>();

  const requests = (requestRows ?? []).map(mapMeetingRequestFromRow);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[#FAFAFA]">Sessions</h1>
        <Link
          href="/dashboard/request-meeting"
          className="rounded-input bg-brand px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-hover"
        >
          + Request session
        </Link>
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-[rgba(250,250,250,0.4)]">
          No session requests yet.{' '}
          <Link href="/dashboard/request-meeting" className="text-brand hover:underline">
            Request one →
          </Link>
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/[0.07] bg-surface-card p-4"
            >
              <div>
                <p className="text-sm font-medium text-[#FAFAFA]">{request.title}</p>
                <p className="text-xs text-[rgba(250,250,250,0.5)]">
                  {request.category ?? 'general'} · {new Date(request.requestedDate).toLocaleString()} ·{' '}
                  {request.durationMinutes} min
                </p>
                {request.adminNote ? (
                  <p className="mt-1 text-xs text-[rgba(250,250,250,0.4)]">Note: {request.adminNote}</p>
                ) : null}
              </div>
              <span className={`rounded-badge px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[request.status]}`}>
                {request.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
