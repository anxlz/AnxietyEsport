import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import type { NotificationType } from '@/lib/types/database';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  content?: string;
  link?: string;
  actorId?: string;
}

export async function createNotification({
  userId,
  type,
  title,
  content,
  link,
  actorId,
}: CreateNotificationInput): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    content,
    link,
    actor_id: actorId,
  });
}
