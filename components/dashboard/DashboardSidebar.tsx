'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement, ReactNode, SVGProps } from 'react';
import { signOut } from '@/lib/auth/actions';
import { SupabaseImage } from '@/components/shared/SupabaseImage';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/types/database';

interface DashboardSidebarProps {
  role: UserRole;
  username: string | null;
  avatarUrl: string | null;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavLink {
  href: string;
  label: string;
  icon: ReactElement;
}

function IconBase({ children, ...props }: { children: ReactNode } & SVGProps<SVGSVGElement>): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

function GridIcon(): ReactElement {
  return (
    <IconBase>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </IconBase>
  );
}

function CalendarIcon(): ReactElement {
  return (
    <IconBase>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </IconBase>
  );
}

function UsersIcon(): ReactElement {
  return (
    <IconBase>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 14.2c2.4.5 4 2.3 4 5.8" />
    </IconBase>
  );
}

function ChartIcon(): ReactElement {
  return (
    <IconBase>
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
      <path d="M3 20h18" />
    </IconBase>
  );
}

function CheckIcon(): ReactElement {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.3 2.3 4.7-5.1" />
    </IconBase>
  );
}

function UserIcon(): ReactElement {
  return (
    <IconBase>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </IconBase>
  );
}

function PlusIcon(): ReactElement {
  return (
    <IconBase>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

function MessageIcon(): ReactElement {
  return (
    <IconBase>
      <path d="M21 11.5a8.4 8.4 0 0 1-1.2 4.4L21 20l-4.3-1.1A8.5 8.5 0 1 1 21 11.5Z" />
    </IconBase>
  );
}

function InboxIcon(): ReactElement {
  return (
    <IconBase>
      <path d="M3 12h4l2 3h6l2-3h4" />
      <rect x="3" y="5" width="18" height="14" rx="2" />
    </IconBase>
  );
}

function ShieldIcon(): ReactElement {
  return (
    <IconBase>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
    </IconBase>
  );
}

const NAV_BY_ROLE: Record<UserRole, NavLink[]> = {
  manager: [
    { href: '/dashboard/manager', label: 'Overview', icon: <GridIcon /> },
    { href: '/dashboard/manager/matches', label: 'Matches', icon: <CalendarIcon /> },
    { href: '/dashboard/manager/roster', label: 'Roster', icon: <UsersIcon /> },
    { href: '/dashboard/manager/results', label: 'Results', icon: <ChartIcon /> },
  ],
  player: [
    { href: '/dashboard/player', label: 'Overview', icon: <GridIcon /> },
    { href: '/dashboard/player/calendar', label: 'Calendar', icon: <CalendarIcon /> },
    { href: '/dashboard/player/tasks', label: 'Tasks', icon: <CheckIcon /> },
    { href: '/dashboard/player/stats', label: 'My Stats', icon: <ChartIcon /> },
    { href: '/dashboard/player/profile', label: 'Profile', icon: <UserIcon /> },
  ],
  coach: [
    { href: '/dashboard/coach', label: 'Overview', icon: <GridIcon /> },
    { href: '/dashboard/coach/tasks', label: 'Create Task', icon: <PlusIcon /> },
    { href: '/dashboard/coach/sessions', label: 'Sessions', icon: <CalendarIcon /> },
    { href: '/dashboard/coach/chat', label: 'Chat', icon: <MessageIcon /> },
  ],
  staff: [
    { href: '/dashboard/staff', label: 'Overview', icon: <GridIcon /> },
    { href: '/dashboard/staff/tasks', label: 'Tasks', icon: <CheckIcon /> },
    { href: '/dashboard/staff/chat', label: 'Chat', icon: <MessageIcon /> },
  ],
  admin: [
    { href: '/dashboard/admin', label: 'Overview', icon: <GridIcon /> },
    { href: '/dashboard/admin/applications', label: 'Applications', icon: <InboxIcon /> },
    { href: '/dashboard/admin/calendar', label: 'Calendar', icon: <CalendarIcon /> },
    { href: '/dashboard/admin/users', label: 'Users', icon: <UsersIcon /> },
    { href: '/dashboard/admin/rosters', label: 'Rosters', icon: <ShieldIcon /> },
  ],
};

function SidebarContent({
  role,
  username,
  avatarUrl,
  pathname,
  onNavigate,
}: {
  role: UserRole;
  username: string | null;
  avatarUrl: string | null;
  pathname: string;
  onNavigate?: () => void;
}): ReactElement {
  const links = NAV_BY_ROLE[role];

  return (
    <div className="flex h-full flex-col bg-[#0D0D10]">
      <Link
        href="/"
        className="flex items-center gap-2 px-4 py-5"
        onClick={onNavigate}
      >
        <span className="h-7 w-7 rounded-[6px] bg-brand" />
        <span className="text-sm font-bold tracking-wide text-[#FAFAFA]">Anxiety Esports</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== `/dashboard/${role}` && pathname.startsWith(`${link.href}/`));

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-r-[8px] px-3 py-2 text-sm transition-colors',
                isActive
                  ? '-ml-px border-l-2 border-brand bg-white/[0.06] text-[#FAFAFA]'
                  : 'text-[rgba(250,250,250,0.55)] hover:bg-white/[0.04] hover:text-[#FAFAFA]'
              )}
            >
              {link.icon}
              {link.label}
            </Link>
          );
        })}

        <Link
          href="/dashboard/request-meeting"
          onClick={onNavigate}
          className={cn(
            'mt-auto flex items-center gap-3 rounded-r-[8px] px-3 py-2 text-sm transition-colors',
            pathname === '/dashboard/request-meeting'
              ? '-ml-px border-l-2 border-brand bg-white/[0.06] text-[#FAFAFA]'
              : 'text-[rgba(250,250,250,0.55)] hover:bg-white/[0.04] hover:text-[#FAFAFA]'
          )}
        >
          <CalendarIcon />
          Request meeting
        </Link>
      </nav>

      <div className="flex items-center gap-3 border-t border-white/[0.07] p-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-xs font-medium uppercase text-[rgba(250,250,250,0.7)]">
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
        </span>
        <span className="truncate text-sm text-[rgba(250,250,250,0.85)]">{username ?? 'Unnamed'}</span>
        <form action={signOut} className="ml-auto">
          <button
            type="submit"
            className="text-xs text-[rgba(250,250,250,0.3)] transition-colors hover:text-white"
          >
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}

export function DashboardSidebar({
  role,
  username,
  avatarUrl,
  mobileOpen = false,
  onMobileClose,
}: DashboardSidebarProps): ReactElement {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-[220px] shrink-0 border-r border-white/[0.07] md:block">
        <SidebarContent role={role} username={username} avatarUrl={avatarUrl} pathname={pathname} />
      </aside>

      {/* Mobile slide-over */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 h-full w-[260px] border-r border-white/[0.07] bg-[#0D0D10]">
            <SidebarContent
              role={role}
              username={username}
              avatarUrl={avatarUrl}
              pathname={pathname}
              onNavigate={onMobileClose}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
