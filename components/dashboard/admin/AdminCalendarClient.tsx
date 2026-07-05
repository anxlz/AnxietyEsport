'use client';

import { useState, type ReactElement } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/toast';
import type { AdminEvent, AdminUnavailable, MeetingRequest } from '@/lib/types/database';

interface AdminCalendarClientProps {
  adminId: string;
  meetingRequests: MeetingRequest[];
  adminEvents: AdminEvent[];
  adminUnavailable: AdminUnavailable[];
}

const CATEGORY_COLOR: Record<string, string> = {
  coaching: '#8943F9',
  strategy: '#3b82f6',
  media: '#f59e0b',
  admin: '#14b8a6',
  other: '#6b7280',
};

type ModalMode = 'event' | 'block' | null;

export function AdminCalendarClient({
  adminId,
  meetingRequests,
  adminEvents,
  adminUnavailable,
}: AdminCalendarClientProps): ReactElement {
  const supabase = createSupabaseBrowserClient();
  const [events, setEvents] = useState<AdminEvent[]>(adminEvents);
  const [blocks, setBlocks] = useState<AdminUnavailable[]>(adminUnavailable);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  function openModal(mode: ModalMode, dateStr?: string): void {
    setModalMode(mode);
    setTitle('');
    setDescription('');
    if (dateStr) {
      setStart(`${dateStr}T09:00`);
      setEnd(`${dateStr}T10:00`);
    } else {
      setStart('');
      setEnd('');
    }
  }

  function handleDateClick(arg: DateClickArg): void {
    openModal('event', arg.dateStr);
  }

  async function handleSave(): Promise<void> {
    if (!start || !end) return;
    setSaving(true);

    if (modalMode === 'event') {
      const { data, error } = await supabase
        .from('admin_events')
        .insert({
          title: title || 'Team event',
          description: description || null,
          start_time: new Date(start).toISOString(),
          end_time: new Date(end).toISOString(),
          created_by: adminId,
        })
        .select()
        .single();
      if (error) {
        toast.error(error.message);
      } else if (data) {
        setEvents((prev) => [
          ...prev,
          {
            id: data.id,
            title: data.title,
            description: data.description,
            startTime: data.start_time,
            endTime: data.end_time,
            type: data.type,
            invitedUserIds: data.invited_user_ids ?? [],
            createdBy: data.created_by,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          },
        ]);
        toast.success('Event created.');
      }
    } else if (modalMode === 'block') {
      const { data, error } = await supabase
        .from('admin_unavailable')
        .insert({
          start_time: new Date(start).toISOString(),
          end_time: new Date(end).toISOString(),
          reason: description || null,
          created_by: adminId,
        })
        .select()
        .single();
      if (error) {
        toast.error(error.message);
      } else if (data) {
        setBlocks((prev) => [
          ...prev,
          {
            id: data.id,
            startTime: data.start_time,
            endTime: data.end_time,
            reason: data.reason,
            createdBy: data.created_by,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          },
        ]);
        toast.success('Time blocked.');
      }
    }

    setSaving(false);
    setModalMode(null);
  }

  const calendarEvents = [
    ...meetingRequests
      .filter((request) => request.status === 'approved')
      .map((request) => ({
        id: `meeting-${request.id}`,
        title: request.title,
        start: request.requestedDate,
        backgroundColor: CATEGORY_COLOR[request.category ?? 'other'],
        borderColor: 'transparent',
      })),
    ...events.map((event) => ({
      id: `event-${event.id}`,
      title: event.title,
      start: event.startTime,
      end: event.endTime,
      backgroundColor: '#8943F9',
      borderColor: 'transparent',
    })),
    ...blocks.map((block) => ({
      id: `block-${block.id}`,
      title: block.reason ?? 'Unavailable',
      start: block.startTime,
      end: block.endTime,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderColor: 'transparent',
      textColor: 'rgba(255,255,255,0.6)',
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => openModal('block')}>
          + Block time
        </Button>
        <Button type="button" onClick={() => openModal('event')}>
          + New event
        </Button>
      </div>

      <div className="rounded-card border border-white/[0.07] bg-surface-card p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
          events={calendarEvents}
          dateClick={handleDateClick}
          height="auto"
        />
      </div>

      {modalMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-4 rounded-card border border-white/[0.07] bg-[#111114] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#FAFAFA]">
                {modalMode === 'event' ? 'New event' : 'Block time'}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="text-[rgba(250,250,250,0.4)] hover:text-white"
              >
                ✕
              </button>
            </div>

            {modalMode === 'event' ? (
              <div className="space-y-1.5">
                <Label htmlFor="eventTitle">Title</Label>
                <Input id="eventTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="desc">{modalMode === 'event' ? 'Description' : 'Reason'}</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start">Start</Label>
                <Input id="start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end">End</Label>
                <Input id="end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>

            <Button type="button" onClick={handleSave} disabled={saving || !start || !end} className="w-full">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
