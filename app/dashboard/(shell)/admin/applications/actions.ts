'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types/database';

interface ActionResult { success: boolean; error?: string; }

async function assertCallerIsAdmin(): Promise<{ adminId: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };
  const service = createSupabaseServiceRoleClient();
  const { data: profile } = await service.from('users').select('role').eq('id', user.id).single<{ role: UserRole | null }>();
  if (profile?.role !== 'admin') return { error: 'Only admins can review applications.' };
  return { adminId: user.id };
}

export async function approveApplication(applicationId: string, applicantUserId: string, role: UserRole, note: string): Promise<ActionResult> {
  const auth = await assertCallerIsAdmin();
  if ('error' in auth) return { success: false, error: auth.error };
  const service = createSupabaseServiceRoleClient();
  const { error: appError } = await service.from('applications').update({ status: 'approved', admin_note: note || null, reviewed_at: new Date().toISOString(), reviewed_by: auth.adminId }).eq('id', applicationId);
  if (appError) return { success: false, error: appError.message };
  const { error: userError } = await service.from('users').update({ role, status: 'approved' }).eq('id', applicantUserId);
  if (userError) return { success: false, error: userError.message };
  await service.from('notifications').insert({ user_id: applicantUserId, type: 'application_approved', title: 'Your application was approved', content: `You've been approved as ${role}. Welcome to Anxiety Esports.`, link: '/dashboard', actor_id: auth.adminId });
  revalidatePath('/dashboard/admin/applications');
  return { success: true };
}

export async function rejectApplication(applicationId: string, applicantUserId: string, note: string): Promise<ActionResult> {
  const auth = await assertCallerIsAdmin();
  if ('error' in auth) return { success: false, error: auth.error };
  const service = createSupabaseServiceRoleClient();
  const { error: appError } = await service.from('applications').update({ status: 'rejected', admin_note: note || null, reviewed_at: new Date().toISOString(), reviewed_by: auth.adminId }).eq('id', applicationId);
  if (appError) return { success: false, error: appError.message };
  await service.from('users').update({ status: 'rejected' }).eq('id', applicantUserId);
  await service.from('notifications').insert({ user_id: applicantUserId, type: 'application_rejected', title: 'Your application was not approved', content: note || 'Your application has been reviewed.', link: '/apply/status', actor_id: auth.adminId });
  revalidatePath('/dashboard/admin/applications');
  return { success: true };
}

export async function deleteApplication(applicationId: string, applicantUserId: string): Promise<ActionResult> {
  const auth = await assertCallerIsAdmin();
  if ('error' in auth) return { success: false, error: auth.error };
  const service = createSupabaseServiceRoleClient();
  const { error } = await service.from('applications').delete().eq('id', applicationId);
  if (error) return { success: false, error: error.message };
  await service.from('users').update({ status: 'pending', role: null }).eq('id', applicantUserId);
  revalidatePath('/dashboard/admin/applications');
  return { success: true };
}
