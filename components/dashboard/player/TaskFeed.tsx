'use client';

import { useState, type ReactElement } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Task, TaskPriority, TaskStatus } from '@/lib/types/database';

interface TaskFeedProps {
  tasks: Task[];
}

type FilterTab = 'all' | 'open' | 'done';

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'text-[rgba(250,250,250,0.4)]',
  medium: 'text-amber-400',
  high: 'text-red-400',
};

const TYPE_LABEL: Record<string, string> = {
  text: 'Text',
  video: 'Video',
  document: 'Document',
  link: 'Link',
};

export function TaskFeed({ tasks: initialTasks }: TaskFeedProps): ReactElement {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [tab, setTab] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  const filtered = tasks.filter((task) => {
    if (tab === 'all') return true;
    if (tab === 'open') return task.status !== 'done';
    return task.status === 'done';
  });

  async function markDone(taskId: string): Promise<void> {
    setSavingId(taskId);
    const newStatus: TaskStatus = 'done';
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    setSavingId(null);
    if (!error) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-white/[0.07] pb-2">
        {(['all', 'open', 'done'] as FilterTab[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              'rounded-input px-3 py-1.5 text-xs capitalize',
              tab === value
                ? 'bg-brand text-white'
                : 'text-[rgba(250,250,250,0.55)] hover:text-white'
            )}
          >
            {value}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[rgba(250,250,250,0.4)]">No tasks here.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((task) => {
            const expanded = expandedId === task.id;
            return (
              <div
                key={task.id}
                className="cursor-pointer rounded-card border border-white/[0.07] bg-surface-card p-4"
                onClick={() => setExpandedId(expanded ? null : task.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-[#FAFAFA]">{task.title}</p>
                  {task.status === 'done' ? (
                    <span className="rounded-badge bg-green-500/15 px-1.5 py-0.5 text-[10px] text-green-400">
                      Done
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-badge bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-[rgba(250,250,250,0.5)]">
                    {TYPE_LABEL[task.type ?? 'text']}
                  </span>
                  <span className={cn('text-[10px] font-medium', PRIORITY_COLOR[task.priority])}>
                    {task.priority}
                  </span>
                </div>

                {task.dueDate ? (
                  <p className="mt-1 text-xs text-[rgba(250,250,250,0.4)]">
                    Due {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                ) : null}

                {expanded ? (
                  <div className="mt-3 border-t border-white/[0.05] pt-3" onClick={(e) => e.stopPropagation()}>
                    {task.content ? (
                      <p className="text-sm text-[rgba(250,250,250,0.7)]">{task.content}</p>
                    ) : null}
                    {task.mediaUrl ? (
                      <a
                        href={task.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs text-brand hover:underline"
                      >
                        Open attached media →
                      </a>
                    ) : null}

                    {task.status !== 'done' ? (
                      <button
                        type="button"
                        onClick={() => markDone(task.id)}
                        disabled={savingId === task.id}
                        className="mt-3 rounded-input bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {savingId === task.id ? 'Saving...' : 'Mark done'}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
