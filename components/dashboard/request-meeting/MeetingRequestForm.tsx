'use client';

import { useState, type ReactElement } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type { MeetingCategory, MeetingRequest } from '@/lib/types/database';
import { mapMeetingRequestFromRow, type MeetingRequestRow } from '@/lib/types/database-rows';

interface MeetingRequestFormProps {
  userId: string;
  adminBlocks: { startTime: string; endTime: string }[];
  initialRequests: MeetingRequest[];
}

const CATEGORIES: { value: MeetingCategory; label: string }[] = [
  { value: 'coaching', label: 'Coaching' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'media', label: 'Media' },
  { value: 'admin', label: 'Admin' },
  { value: 'other', label: 'Other' },
];

const DURATIONS = [30, 60, 90];

const STATUS_BADGE: Record<MeetingRequest['status'], string> = {
  pending: 'bg-amber-500/15 text-amber-400',
  approved: 'bg-green-500/15 text-green-400',
  rejected: 'bg-red-500/15 text-red-400',
  rescheduled: 'bg-blue-500/15 text-blue-400',
};

function isDateBlocked(dateStr: string, blocks: { startTime: string; endTime: string }[]): boolean {
  const dayStart = new Date(`${dateStr}T00:00:00`).getTime();
  const dayEnd = new Date(`${dateStr}T23:59:59`).getTime();
  return blocks.some((block) => {
    const blockStart = new Date(block.startTime).getTime();
    const blockEnd = new Date(block.endTime).getTime();
    return blockStart <= dayEnd && blockEnd >= dayStart;
  });
}

export function MeetingRequestForm({
  userId,
  adminBlocks,
  initialRequests,
}: MeetingRequestFormProps): ReactElement {
  const [category, setCategory] = useState<MeetingCategory | ''>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [duration, setDuration] = useState<number>(60);
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<MeetingRequest[]>(initialRequests);

  const supabase = createSupabaseBrowserClient();
  const today = new Date().toISOString().slice(0, 10);
  const dateBlocked = date ? isDateBlocked(date, adminBlocks) : false;

  async function handleSubmit(): Promise<void> {
    if (!category || !title.trim() || !date || !time) {
      const message = 'Category, title, date, and time are required.';
      setError(message);
      toast.error(message);
      return;
    }
    if (dateBlocked) {
      const message = 'That date is blocked by the admin. Please pick another date.';
      setError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);
    setError(null);

    const requestedDate = new Date(`${date}T${time}`).toISOString();

    const { data, error: insertError } = await supabase
      .from('meeting_requests')
      .insert({
        requester_id: userId,
        title,
        description: description || null,
        category,
        requested_date: requestedDate,
        duration_minutes: duration,
        status: 'pending',
      })
      .select()
      .single<MeetingRequestRow>();

    if (insertError || !data) {
      setSubmitting(false);
      const message = insertError?.message ?? 'Could not submit request';
      setError(message);
      toast.error(message);
      return;
    }

    toast.success('Meeting request sent.');

    const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
    if (admins && admins.length > 0) {
      await supabase.from('notifications').insert(
        admins.map((admin: { id: string }) => ({
          user_id: admin.id,
          type: 'new_message',
          title: 'New meeting request',
          content: `${title} — ${category}`,
          link: '/dashboard/admin/calendar',
          actor_id: userId,
        }))
      );
    }

    setRequests((prev) => [mapMeetingRequestFromRow(data), ...prev]);
    setSubmitting(false);
    setSubmitted(true);
  }

  function resetForm(): void {
    setSubmitted(false);
    setCategory('');
    setTitle('');
    setDescription('');
    setDuration(60);
    setDate('');
    setTime('');
  }

  if (submitted) {
    return (
      <div className="rounded-card border border-white/[0.07] bg-surface-card p-8 text-center">
        <p className="text-lg font-semibold text-green-400">✓ Request submitted</p>
        <p className="mt-2 text-sm text-[rgba(250,250,250,0.5)]">
          We&apos;ll notify you once the admin responds.
        </p>
        <Button type="button" className="mt-4" onClick={resetForm}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4 rounded-card border border-white/[0.07] bg-surface-card p-6">
        <div>
          <Label>Category</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={cn(
                  'rounded-input border px-3 py-2 text-sm transition-colors',
                  category === cat.value
                    ? 'border-brand bg-brand/10 text-[#FAFAFA]'
                    : 'border-white/[0.07] bg-surface text-[rgba(250,250,250,0.6)] hover:border-white/[0.15]'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>

        <div>
          <Label htmlFor="duration">Duration</Label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1.5 w-full rounded-input border border-white/[0.1] bg-[#0D0D10] px-3 py-2 text-sm text-[#FAFAFA] focus:border-brand focus:outline-none"
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            {dateBlocked ? <p className="mt-1 text-xs text-red-400">This date is blocked by the admin.</p> : null}
          </div>
          <div>
            <Label htmlFor="time">Time</Label>
            <Input id="time" type="time" step={1800} value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <Button type="button" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit request'}
        </Button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-[#FAFAFA]">My requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-[rgba(250,250,250,0.4)]">No requests yet.</p>
        ) : (
          <ul className="space-y-2">
            {requests.slice(0, 5).map((req) => (
              <li
                key={req.id}
                className="flex items-center justify-between rounded-input border border-white/[0.07] bg-surface-elevated px-4 py-3"
              >
                <div>
                  <p className="text-sm text-[#FAFAFA]">{req.title}</p>
                  <p className="text-xs text-[rgba(250,250,250,0.5)]">
                    {req.category} · {new Date(req.requestedDate).toLocaleString()}
                  </p>
                </div>
                <span className={cn('rounded-badge px-2 py-0.5 text-xs', STATUS_BADGE[req.status])}>
                  {req.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
