import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ApplicationsQueue, type ApplicationQueueItem } from '@/components/dashboard/admin/ApplicationsQueue';
import type { ApplicationStatus, UserRole } from '@/lib/types/database';

interface ApplicationWithUserRow {
  id: string;
  user_id: string;
  role: UserRole | null;
  reason: string | null;
  experience: string | null;
  social_links: Record<string, string> | null;
  status: ApplicationStatus;
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  users: {
    id: string;
    email: string | null;
    username: string | null;
    full_name: string | null;
    created_at: string;
  } | null;
}

export default async function AdminApplicationsPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: rows } = await supabase
    .from('applications')
    .select('*, users(id, email, username, full_name, created_at)')
    .order('created_at', { ascending: true })
    .returns<ApplicationWithUserRow[]>();

  const applications: ApplicationQueueItem[] = (rows ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    role: row.role,
    reason: row.reason,
    experience: row.experience,
    socialLinks: row.social_links,
    status: row.status,
    adminNote: row.admin_note,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    userEmail: row.users?.email ?? null,
    username: row.users?.username ?? null,
    fullName: row.users?.full_name ?? null,
  }));

  return <ApplicationsQueue applications={applications} currentAdminId={user.id} />;
}
