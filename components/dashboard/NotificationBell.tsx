'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { mapNotificationFromRow, type NotificationRow } from '@/lib/types/database-rows';
import type { Notification } from '@/lib/types/database';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  userId: string;
}

function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

function NotificationIcon({ type }: { type: Notification['type'] }): ReactElement {
  if (type === 'application_approved' || type === 'meeting_approved' || type === 'task_completed') {
    return (
      <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#4ADE80" strokeWidth={2} strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 12.5l2.3 2.3 4.7-5.1" />
      </svg>
    );
  }
  if (type === 'application_rejected' || type === 'meeting_rejected') {
    return (
      <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#F87171" strokeWidth={2} strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9l6 6" />
        <path d="M15 9l-6 6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#8943F9" strokeWidth={2} strokeLinecap="round">
      <path d="M18 8a6 6 0 1 0-12 0c0 3.5-1 5.5-1.5 6.5a.6.6 0 0 0 .5 1h14a.6.6 0 0 0 .5-1C19 13.5 18 11.5 18 8Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function NotificationBell({ userId }: NotificationBellProps): ReactElement {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const supabaseRef = useRef(createSupabaseBrowserClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    let isMounted = true;

    async function fetchInitial(): Promise<void> {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(15)
        .returns<NotificationRow[]>();

      if (isMounted && data) {
        setNotifications(data.map(mapNotificationFromRow));
      }
    }

    fetchInitial();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          setNotifications((prev) => [mapNotificationFromRow(row), ...prev]);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleOpen(): Promise<void> {
    setOpen((prev) => !prev);
    if (unreadCount > 0) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
    }
  }

  async function handleMarkAllRead(): Promise<void> {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative text-[rgba(250,250,250,0.7)] hover:text-white"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
          <path d="M18 8a6 6 0 1 0-12 0c0 3.5-1 5.5-1.5 6.5a.6.6 0 0 0 .5 1h14a.6.6 0 0 0 .5-1C19 13.5 18 11.5 18 8Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-card border border-white/[0.07] bg-[#111114] shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
            <span className="text-sm font-medium text-[#FAFAFA]">Notifications</span>
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-[rgba(250,250,250,0.5)] hover:text-white"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[rgba(250,250,250,0.4)]">
                No notifications yet
              </p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex gap-3 border-b border-white/[0.05] px-4 py-3 last:border-b-0',
                    !notification.read && 'border-l-2 border-l-brand bg-white/[0.03]'
                  )}
                >
                  <span className="mt-0.5 shrink-0">
                    <NotificationIcon type={notification.type} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[#FAFAFA]">{notification.title}</p>
                    {notification.content ? (
                      <p className="truncate text-xs text-[rgba(250,250,250,0.5)]">{notification.content}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-[rgba(250,250,250,0.3)]">
                      {relativeTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
