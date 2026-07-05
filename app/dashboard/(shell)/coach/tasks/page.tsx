import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapTaskFromRow, type UserRow, type TaskRow } from '@/lib/types/database-rows';
import { CreateTaskForm, type AssignableUser } from '@/components/dashboard/coach/CreateTaskForm';

export default async function CoachCreateTaskPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: userRows }, { data: taskRows }] = await Promise.all([
    supabase
      .from('users')
      .select('id, username, ign')
      .eq('status', 'approved')
      .order('username', { ascending: true })
      .returns<Pick<UserRow, 'id' | 'username' | 'ign'>[]>(),
    supabase
      .from('tasks')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
      .returns<TaskRow[]>(),
  ]);

  const assignableUsers: AssignableUser[] = (userRows ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    ign: row.ign,
  }));

  const myTasks = (taskRows ?? []).map(mapTaskFromRow);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <h1 className="text-lg font-semibold text-[#FAFAFA]">Create task</h1>
        <CreateTaskForm creatorId={user.id} assignableUsers={assignableUsers} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#FAFAFA]">Your recent tasks</h2>
        {myTasks.length === 0 ? (
          <p className="text-sm text-[rgba(250,250,250,0.4)]">You haven't created any tasks yet.</p>
        ) : (
          myTasks.map((task) => (
            <div key={task.id} className="rounded-card border border-white/[0.07] bg-surface-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-[#FAFAFA]">{task.title}</p>
                <span className="rounded-badge bg-white/[0.05] px-1.5 py-0.5 text-[10px] capitalize text-[rgba(250,250,250,0.5)]">
                  {task.status.replace('_', ' ')}
                </span>
              </div>
              <p className="mt-1 text-xs text-[rgba(250,250,250,0.4)]">
                Assigned to {task.assignedTo.length} {task.assignedTo.length === 1 ? 'person' : 'people'}
                {task.dueDate ? ` · Due ${new Date(task.dueDate).toLocaleDateString()}` : ''}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
