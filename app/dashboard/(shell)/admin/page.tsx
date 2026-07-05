import Link from 'next/link';
import type { ReactElement } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AdminOverviewPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();

  const [{ count: pendingCount }, { count: userCount }, { count: rosterCount }] = await Promise.all([
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('rosters').select('*', { count: 'exact', head: true }).eq('active', true),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/dashboard/admin/applications"
          className="rounded-card border border-white/[0.07] bg-surface-card p-5 transition-colors hover:border-brand/40"
        >
          <p className="text-2xl font-bold text-[#FAFAFA]">{pendingCount ?? 0}</p>
          <p className="mt-1 text-xs text-[rgba(250,250,250,0.5)]">Pending applications</p>
        </Link>

        <div className="rounded-card border border-white/[0.07] bg-surface-card p-5">
          <p className="text-2xl font-bold text-[#FAFAFA]">{userCount ?? 0}</p>
          <p className="mt-1 text-xs text-[rgba(250,250,250,0.5)]">Total users</p>
        </div>

        <div className="rounded-card border border-white/[0.07] bg-surface-card p-5">
          <p className="text-2xl font-bold text-[#FAFAFA]">{rosterCount ?? 0}</p>
          <p className="mt-1 text-xs text-[rgba(250,250,250,0.5)]">Active rosters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/admin/applications"
          className="rounded-card border border-white/[0.07] bg-surface-card p-5 text-sm text-[#FAFAFA] transition-colors hover:border-brand/40"
        >
          Review applications →
        </Link>
        <Link
          href="/dashboard/admin/users"
          className="rounded-card border border-white/[0.07] bg-surface-card p-5 text-sm text-[#FAFAFA] transition-colors hover:border-brand/40"
        >
          Manage users →
        </Link>
        <Link
          href="/dashboard/admin/rosters"
          className="rounded-card border border-white/[0.07] bg-surface-card p-5 text-sm text-[#FAFAFA] transition-colors hover:border-brand/40"
        >
          Manage rosters →
        </Link>
        <Link
          href="/dashboard/admin/calendar"
          className="rounded-card border border-white/[0.07] bg-surface-card p-5 text-sm text-[#FAFAFA] transition-colors hover:border-brand/40"
        >
          View calendar →
        </Link>
      </div>
    </div>
  );
}
