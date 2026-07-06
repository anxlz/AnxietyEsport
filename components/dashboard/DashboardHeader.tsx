'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { SupabaseImage } from '@/components/shared/SupabaseImage';

interface DashboardHeaderProps {
  username: string | null;
  avatarUrl: string | null;
  userId: string;
  onMenuClick: () => void;
}

export function DashboardHeader({
  username,
  avatarUrl,
  userId,
  onMenuClick,
}: DashboardHeaderProps): ReactElement {
  return (
    <header className="flex h-14 items-center justify-between border-b border-white/[0.07] bg-surface px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="text-[rgba(250,250,250,0.7)] hover:text-white md:hidden"
        aria-label="Open menu"
      >
        <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
          <path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" />
        </svg>
      </button>

      <div className="ml-auto flex items-center gap-4">
        <NotificationBell userId={userId} username={username} />

        {/* Clickable avatar → profile settings */}
        <Link
          href="/dashboard/profile"
          className="group flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-xs font-medium uppercase text-[rgba(250,250,250,0.7)] ring-2 ring-transparent transition-all hover:ring-brand"
          title="Profile settings"
        >
          {avatarUrl ? (
            <SupabaseImage
              src={avatarUrl}
              alt={username ?? 'avatar'}
              width={32}
              height={32}
              className="h-full w-full object-cover"
            />
          ) : (
            (username ?? '?').slice(0, 1)
          )}
        </Link>
      </div>
    </header>
  );
}
