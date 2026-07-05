import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapMeetingRequestFromRow, type MeetingRequestRow } from '@/lib/types/database-rows';
import { MeetingRequestForm } from '@/components/dashboard/request-meeting/MeetingRequestForm';

export default async function RequestMeetingPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: blockRows } = await supabase
    .from('admin_unavailable')
    .select('start_time, end_time')
    .gte('end_time', new Date().toISOString())
    .returns<{ start_time: string; end_time: string }[]>();

  const adminBlocks = (blockRows ?? []).map((row) => ({
    startTime: row.start_time,
    endTime: row.end_time,
  }));

  const { data: requestRows } = await supabase
    .from('meeting_requests')
    .select('*')
    .eq('requester_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)
    .returns<MeetingRequestRow[]>();

  const initialRequests = (requestRows ?? []).map(mapMeetingRequestFromRow);

  return (
    <MeetingRequestForm userId={user.id} adminBlocks={adminBlocks} initialRequests={initialRequests} />
  );
}
