import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapTaskFromRow, type TaskRow } from '@/lib/types/database-rows';
import { TaskFeed } from '@/components/dashboard/player/TaskFeed';

export default async function PlayerTasksPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: taskRows } = await supabase
    .from('tasks')
    .select('*')
    .contains('assigned_to', [user.id])
    .order('created_at', { ascending: false })
    .returns<TaskRow[]>();

  const tasks = (taskRows ?? []).map(mapTaskFromRow);

  return <TaskFeed tasks={tasks} />;
}
