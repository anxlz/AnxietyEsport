'use client';

import { useState, type ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { approveApplication, rejectApplication } from '@/app/dashboard/(shell)/admin/applications/actions';
import type { ApplicationStatus, UserRole } from '@/lib/types/database';

export interface ApplicationQueueItem {
  id: string;
  userId: string;
  role: UserRole | null;
  reason: string | null;
  experience: string | null;
  socialLinks: Record<string, string> | null;
  status: ApplicationStatus;
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  userEmail: string | null;
  username: string | null;
  fullName: string | null;
}

interface ApplicationsQueueProps {
  applications: ApplicationQueueItem[];
  currentAdminId: string;
}

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

const ROLE_BADGE: Record<UserRole, string> = {
  player: 'bg-[#8943F9]/15 text-[#8943F9]',
  manager: 'bg-blue-500/15 text-blue-400',
  coach: 'bg-amber-500/15 text-amber-400',
  staff: 'bg-teal-500/15 text-teal-400',
  admin: 'bg-white/[0.1] text-white',
};

export function ApplicationsQueue({
  applications: initialApplications,
  currentAdminId,
}: ApplicationsQueueProps): ReactElement {
  const [applications, setApplications] = useState<ApplicationQueueItem[]>(initialApplications);
  const [tab, setTab] = useState<FilterTab>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actingId, setActingId] = useState<string | null>(null);

  const filtered = applications.filter((app) => tab === 'all' || app.status === tab);

  async function handleApprove(app: ApplicationQueueItem): Promise<void> {
    if (!app.role) {
      toast.error('This application has no role to approve.');
      return;
    }
    setActingId(app.id);
    const note = notes[app.id] ?? '';

    const result = await approveApplication(app.id, app.userId, app.role, note);
    setActingId(null);

    if (!result.success) {
      toast.error(result.error ?? 'Could not approve this application.');
      return;
    }

    toast.success(`${app.fullName ?? app.username ?? 'Applicant'} approved as ${app.role}.`);
    setApplications((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, status: 'approved', adminNote: note || null } : a))
    );
  }

  async function handleReject(app: ApplicationQueueItem): Promise<void> {
    setActingId(app.id);
    const note = notes[app.id] ?? '';

    const result = await rejectApplication(app.id, app.userId, note);
    setActingId(null);

    if (!result.success) {
      toast.error(result.error ?? 'Could not reject this application.');
      return;
    }

    toast.success(`${app.fullName ?? app.username ?? 'Applicant'} rejected.`);
    setApplications((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, status: 'rejected', adminNote: note || null } : a))
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-white/[0.07] pb-2">
        {(['all', 'pending', 'approved', 'rejected'] as FilterTab[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              'rounded-input px-3 py-1.5 text-xs capitalize',
              tab === value ? 'bg-brand text-white' : 'text-[rgba(250,250,250,0.55)] hover:text-white'
            )}
          >
            {value}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[rgba(250,250,250,0.4)]">No applications here.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => {
            const expanded = expandedId === app.id;
            const acting = actingId === app.id;

            return (
              <div key={app.id} className="rounded-card border border-white/[0.07] bg-surface-card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  {app.role ? (
                    <span className={cn('rounded-badge px-2 py-0.5 text-xs font-medium', ROLE_BADGE[app.role])}>
                      {app.role}
                    </span>
                  ) : null}
                  <span className="text-sm font-medium text-[#FAFAFA]">
                    {app.fullName ?? 'Unnamed'} {app.username ? `(${app.username})` : ''}
                  </span>
                  <span className="text-xs text-[rgba(250,250,250,0.5)]">{app.userEmail}</span>
                  <span className="ml-auto text-xs text-[rgba(250,250,250,0.4)]">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {app.reason ? (
                  <p className={cn('mt-2 text-sm text-[rgba(250,250,250,0.7)]', !expanded && 'line-clamp-2')}>
                    Reason: {app.reason}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : app.id)}
                  className="mt-1 text-xs text-brand hover:underline"
                >
                  {expanded ? '▲ Show less' : '▼ Show more'}
                </button>

                {expanded ? (
                  <div className="mt-2 space-y-2">
                    {app.experience ? (
                      <p className="text-sm text-[rgba(250,250,250,0.7)]">Experience: {app.experience}</p>
                    ) : null}
                    {app.socialLinks && Object.keys(app.socialLinks).length > 0 ? (
                      <div className="flex flex-wrap gap-2 text-xs text-brand">
                        {Object.entries(app.socialLinks).map(([key, value]) => (
                          <a key={key} href={value} target="_blank" rel="noreferrer" className="hover:underline">
                            {key}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {app.status === 'pending' ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      placeholder="Admin note (optional)"
                      value={notes[app.id] ?? ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [app.id]: e.target.value }))}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleReject(app)}
                      disabled={acting}
                    >
                      {acting ? <LoadingSpinner size={14} /> : 'Reject'}
                    </Button>
                    <Button type="button" onClick={() => handleApprove(app)} disabled={acting || !app.role}>
                      {acting ? <LoadingSpinner size={14} /> : 'Approve'}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-[rgba(250,250,250,0.4)]">
                    {app.status === 'approved' ? 'Approved' : 'Rejected'}
                    {app.adminNote ? ` · ${app.adminNote}` : ''}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
