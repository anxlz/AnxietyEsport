'use client';

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { mapMessageFromRow, mapUserFromRow, type MessageRow, type UserRow } from '@/lib/types/database-rows';
import type { Message, User } from '@/lib/types/database';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SupabaseImage } from '@/components/shared/SupabaseImage';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  currentUserId: string;
  initialContacts: User[];
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/15 text-red-400',
  manager: 'bg-blue-500/15 text-blue-400',
  coach: 'bg-amber-500/15 text-amber-400',
  staff: 'bg-teal-500/15 text-teal-400',
  player: 'bg-[#8943F9]/15 text-[#8943F9]',
};

function UserAvatar({ user }: { user: User }): ReactElement {
  const initials = (user.username ?? user.fullName ?? '?').slice(0, 1).toUpperCase();
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-xs font-medium uppercase text-[rgba(250,250,250,0.7)]">
      {user.avatarUrl ? (
        <SupabaseImage src={user.avatarUrl} alt={user.username ?? 'avatar'} width={32} height={32} className="h-full w-full object-cover" />
      ) : initials}
    </span>
  );
}

export function ChatPanel({ currentUserId, initialContacts }: ChatPanelProps): ReactElement {
  const supabase = createSupabaseBrowserClient();
  const [contacts] = useState<User[]>(initialContacts);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [activeContact, setActiveContact] = useState<User | null>(null); // No default — prevents cross-account leak
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const visibleContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const merged = [...contacts, ...searchResults];
    const seen = new Set<string>();
    return merged.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [contacts, searchResults, searchQuery]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    let active = true;
    void supabase
      .from('users')
      .select('*')
      .ilike('username', `%${searchQuery}%`)
      .neq('id', currentUserId)
      .limit(8)
      .returns<UserRow[]>()
      .then(({ data }) => { if (active) setSearchResults((data ?? []).map(mapUserFromRow)); });
    return () => { active = false; };
  }, [searchQuery, currentUserId, supabase]);

  // Load messages and subscribe when active contact changes.
  // Unsubscribe from previous channel before subscribing to new one
  // to prevent cross-account / cross-thread message leakage.
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!activeContact) return;

    let active = true;
    setMessages([]);
    setLoading(true);

    void supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${activeContact.id}),and(sender_id.eq.${activeContact.id},receiver_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true })
      .returns<MessageRow[]>()
      .then(({ data }) => {
        if (!active) return;
        setMessages((data ?? []).map(mapMessageFromRow));
        setLoading(false);
      });

    // Unique channel name per user-pair — prevents messages from other
    // conversations leaking into this thread via a shared channel subscription.
    const [a, b] = [currentUserId, activeContact.id].sort();
    const channel = supabase
      .channel(`thread-${a}-${b}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as MessageRow;
          const inThread =
            (row.sender_id === currentUserId && row.receiver_id === activeContact.id) ||
            (row.sender_id === activeContact.id && row.receiver_id === currentUserId);
          if (inThread) setMessages((prev) => [...prev, mapMessageFromRow(row)]);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      active = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [activeContact, currentUserId, supabase]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleSend(): Promise<void> {
    if (!draft.trim() || !activeContact) return;
    const content = draft.trim();
    setDraft('');

    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: currentUserId, receiver_id: activeContact.id, content })
      .select()
      .single<MessageRow>();

    if (error) { toast.error(error.message); return; }

    if (data) {
      setMessages((prev) => [...prev, mapMessageFromRow(data)]);

      // Look up sender username for the notification content
      const { data: senderRow } = await supabase
        .from('users')
        .select('username, full_name')
        .eq('id', currentUserId)
        .single<{ username: string | null; full_name: string | null }>();

      const senderName = senderRow?.username ?? senderRow?.full_name ?? 'Someone';

      await supabase.from('notifications').insert({
        user_id: activeContact.id,
        type: 'new_message',
        title: `New message from ${senderName}`,
        content,
        link: `/dashboard/${activeContact.role ?? 'player'}/chat`,
        actor_id: currentUserId,
      });
    }
  }

  return (
    <div className="grid h-[calc(100vh-180px)] grid-cols-1 gap-0 overflow-hidden rounded-card border border-white/[0.07] bg-surface-card md:grid-cols-[280px_1fr]">
      {/* Contact list */}
      <div className="flex flex-col border-b border-white/[0.07] md:border-b-0 md:border-r">
        <div className="p-3">
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search people..." />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {visibleContacts.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-[rgba(250,250,250,0.4)]">No contacts found.</p>
          ) : (
            visibleContacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => setActiveContact(contact)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-input px-3 py-2 text-left transition-colors',
                  activeContact?.id === contact.id ? 'bg-brand/20 text-white' : 'text-[rgba(250,250,250,0.7)] hover:bg-white/[0.05]'
                )}
              >
                <UserAvatar user={contact} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#FAFAFA]">
                    {contact.username ?? contact.fullName ?? contact.email}
                  </p>
                  {contact.role ? (
                    <span className={cn('inline-block rounded-badge px-1.5 py-0.5 text-[10px] capitalize', ROLE_COLORS[contact.role] ?? 'bg-white/[0.08] text-[rgba(250,250,250,0.5)]')}>
                      {contact.role}
                    </span>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex flex-col overflow-hidden">
        {!activeContact ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[rgba(250,250,250,0.4)]">
            Select someone to start a conversation.
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
              <UserAvatar user={activeContact} />
              <div>
                <p className="text-sm font-semibold text-[#FAFAFA]">
                  {activeContact.username ?? activeContact.fullName ?? activeContact.email}
                </p>
                {activeContact.role ? (
                  <span className={cn('inline-block rounded-badge px-1.5 py-0.5 text-[10px] capitalize', ROLE_COLORS[activeContact.role] ?? 'bg-white/[0.08] text-[rgba(250,250,250,0.5)]')}>
                    {activeContact.role}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {loading ? (
                <p className="text-xs text-[rgba(250,250,250,0.4)]">Loading…</p>
              ) : messages.length === 0 ? (
                <p className="text-xs text-[rgba(250,250,250,0.4)]">No messages yet. Say hello!</p>
              ) : (
                messages.map((message) => {
                  const mine = message.senderId === currentUserId;
                  const sender = mine ? null : activeContact;
                  return (
                    <div key={message.id} className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
                      {!mine && sender ? <UserAvatar user={sender} /> : null}
                      <div className={cn('max-w-[70%] rounded-input px-3 py-2 text-sm', mine ? 'bg-brand text-white' : 'bg-white/[0.06] text-[#FAFAFA]')}>
                        {!mine && (
                          <p className="mb-0.5 text-[10px] font-medium opacity-70">
                            {sender?.username ?? sender?.fullName ?? 'Unknown'}
                          </p>
                        )}
                        {message.content}
                        <p className={cn('mt-0.5 text-[10px] opacity-50', mine ? 'text-right' : '')}>
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); void handleSend(); }}
              className="flex items-center gap-2 border-t border-white/[0.07] p-3"
            >
              <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…" className="flex-1" />
              <Button type="submit" disabled={!draft.trim()}>Send</Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
