'use client';

import { useState, type ReactElement, type ReactNode } from 'react';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import type { UserRole } from '@/lib/types/database';

interface DashboardShellClientProps {
  role: UserRole;
  username: string | null;
  avatarUrl: string | null;
  userId: string;
  children: ReactNode;
}

export function DashboardShellClient({
  role,
  username,
  avatarUrl,
  userId,
  children,
}: DashboardShellClientProps): ReactElement {
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-[#FAFAFA]">
      <DashboardSidebar
        role={role}
        username={username}
        avatarUrl={avatarUrl}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader
          username={username}
          avatarUrl={avatarUrl}
          userId={userId}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
