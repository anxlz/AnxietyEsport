import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  mapMeetingRequestFromRow,
  mapAdminEventFromRow,
  mapAdminUnavailableFromRow,
  type MeetingRequestRow,
  type AdminEventRow,
  type AdminUnavailableRow,
} from '@/lib/types/database-rows';
import { AdminCalendarClient } from '@/components/dashboard/admin/AdminCalendarClient';

export default async function AdminCalendarPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: meetingRows }, { data: eventRows }, { data: blockRows }] = await Promise.all([
    supabase.from('meeting_requests').select('*').returns<MeetingRequestRow[]>(),
    supabase.from('admin_events').select('*').returns<AdminEventRow[]>(),
    supabase.from('admin_unavailable').select('*').returns<AdminUnavailableRow[]>(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-[#FAFAFA]">Calendar</h1>
      <AdminCalendarClient
        adminId={user.id}
        meetingRequests={(meetingRows ?? []).map(mapMeetingRequestFromRow)}
        adminEvents={(eventRows ?? []).map(mapAdminEventFromRow)}
        adminUnavailable={(blockRows ?? []).map(mapAdminUnavailableFromRow)}
      />
    </div>
  );
}
