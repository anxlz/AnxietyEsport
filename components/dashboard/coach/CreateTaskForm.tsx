'use client';

import { useState, type ReactElement } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { TaskPriority, TaskType } from '@/lib/types/database';

export interface AssignableUser {
  id: string;
  username: string | null;
  ign: string | null;
}

interface CreateTaskFormProps {
  creatorId: string;
  assignableUsers: AssignableUser[];
}

const TASK_TYPES: TaskType[] = ['text', 'video', 'document', 'link'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

export function CreateTaskForm({ creatorId, assignableUsers }: CreateTaskFormProps): ReactElement {
  const supabase = createSupabaseBrowserClient();

  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [type, setType] = useState<TaskType>('text');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [assignAll, setAssignAll] = useState<boolean>(false);
  const [dueDate, setDueDate] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  function toggleAssignee(id: string): void {
    setAssignAll(false);
    setAssignedTo((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!title.trim()) {
      const message = 'Title is required.';
      setError(message);
      toast.error(message);
      return;
    }

    const finalAssignees = assignAll ? assignableUsers.map((u) => u.id) : assignedTo;
    if (finalAssignees.length === 0) {
      const message = 'Assign the task to at least one person.';
      setError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);

    const { data: task, error: insertError } = await supabase
      .from('tasks')
      .insert({
        creator_id: creatorId,
        title: title.trim(),
        content: content.trim() || null,
        type,
        media_url: mediaUrl.trim() || null,
        assigned_to: finalAssignees,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        priority,
        status: 'open',
      })
      .select()
      .single();

    if (insertError || !task) {
      const message = insertError?.message ?? 'Could not create task.';
      setError(message);
      toast.error(message);
      setSubmitting(false);
      return;
    }

    await supabase.from('notifications').insert(
      finalAssignees.map((userId) => ({
        user_id: userId,
        type: 'new_task',
        title: 'New task assigned',
        content: title.trim(),
        link: '/dashboard/player/tasks',
        actor_id: creatorId,
      }))
    );

    setSubmitting(false);
    setSuccess(true);
    toast.success('Task created.');
    setTitle('');
    setContent('');
    setMediaUrl('');
    setAssignedTo([]);
    setAssignAll(false);
    setDueDate('');
    setPriority('medium');
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-card border border-white/[0.07] bg-surface-card p-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Review Hacienda HP setups" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="content">Content</Label>
        <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Details for this task..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <div className="flex flex-wrap gap-2">
            {TASK_TYPES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={cn(
                  'rounded-input px-3 py-1.5 text-xs capitalize',
                  type === value ? 'bg-brand text-white' : 'border border-white/[0.1] text-[rgba(250,250,250,0.55)] hover:text-white'
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Priority</Label>
          <div className="flex flex-wrap gap-2">
            {PRIORITIES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPriority(value)}
                className={cn(
                  'rounded-input px-3 py-1.5 text-xs capitalize',
                  priority === value ? 'bg-brand text-white' : 'border border-white/[0.1] text-[rgba(250,250,250,0.55)] hover:text-white'
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      {type !== 'text' ? (
        <div className="space-y-1.5">
          <Label htmlFor="mediaUrl">Media URL</Label>
          <Input id="mediaUrl" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://..." />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="dueDate">Due date</Label>
        <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Assign to</Label>
          <button
            type="button"
            onClick={() => {
              setAssignAll((prev) => !prev);
              setAssignedTo([]);
            }}
            className={cn(
              'rounded-badge px-2 py-0.5 text-xs',
              assignAll ? 'bg-brand text-white' : 'border border-white/[0.1] text-[rgba(250,250,250,0.55)]'
            )}
          >
            Entire roster
          </button>
        </div>

        {!assignAll ? (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-input border border-white/[0.07] p-2">
            {assignableUsers.length === 0 ? (
              <p className="px-2 py-2 text-xs text-[rgba(250,250,250,0.4)]">No roster members found.</p>
            ) : (
              assignableUsers.map((u) => (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-2 rounded-input px-2 py-1.5 text-sm text-[#FAFAFA] hover:bg-white/[0.05]"
                >
                  <input
                    type="checkbox"
                    checked={assignedTo.includes(u.id)}
                    onChange={() => toggleAssignee(u.id)}
                    className="accent-[#8943F9]"
                  />
                  {u.username ?? u.ign ?? u.id}
                </label>
              ))
            )}
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {success ? <p className="text-sm text-green-400">Task created.</p> : null}

      <Button type="submit" disabled={submitting}>
        {submitting ? <LoadingSpinner size={14} /> : 'Create task'}
      </Button>
    </form>
  );
}
