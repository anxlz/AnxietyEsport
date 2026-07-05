'use client';

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { mapMessageFromRow, mapUserFromRow, type MessageRow, type UserRow } from '@/lib/types/database-rows';
import type { Message, User } from '@/lib/types/database';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  currentUserId: string;
  initialContacts: User[];
}

export function ChatPanel({ currentUserId, initialContacts }: ChatPanelProps): ReactElement {
  const supabase = createSupabaseBrowserClient();
  const [contacts] = useState<User[]>(initialContacts);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [activeContact, setActiveContact] = useState<User | null>(initialContacts[0] ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

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
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    let active = true;
    void supabase
      .from('users')
      .select('*')
      .ilike('username', `%${searchQuery}%`)
      .neq('id', currentUserId)
      .limit(8)
      .returns<UserRow[]>()
      .then(({ data }) => {
        if (active) setSearchResults((data ?? []).map(mapUserFromRow));
      });
    return () => {
      active = false;
    };
  }, [searchQuery, currentUserId, supabase]);

  useEffect(() => {
    if (!activeContact) return;
    let active = true;
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

    const channel = supabase
      .channel(`messages-${currentUserId}-${activeContact.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as MessageRow;
          const belongsToThread =
            (row.sender_id === currentUserId && row.receiver_id === activeContact.id) ||
            (row.sender_id === activeContact.id && row.receiver_id === currentUserId);
          if (belongsToThread) {
            setMessages((prev) => [...prev, mapMessageFromRow(row)]);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [activeContact, currentUserId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(): Promise<void> {
    if (!draft.trim() || !activeContact) return;
    const content = draft.trim();
    setDraft('');

    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: currentUserId, receiver_id: activeContact.id, content })
      .select()
      .single<MessageRow>();

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data) {
      setMessages((prev) => [...prev, mapMessageFromRow(data)]);
      await supabase.from('notifications').insert({
        user_id: activeContact.id,
        type: 'new_message',
        title: 'New message',
        content,
        link: '/dashboard',
        actor_id: currentUserId,
      });
    }
  }

  return (
    <div className="grid h-[calc(100vh-180px)] grid-cols-1 gap-4 rounded-card border border-white/[0.07] bg-surface-card md:grid-cols-[260px_1fr]">
      <div className="flex flex-col border-b border-white/[0.07] md:border-b-0 md:border-r">
        <div className="p-3">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people..."
          />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {visibleContacts.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-[rgba(250,250,250,0.4)]">No one found.</p>
          ) : (
            visibleContacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => setActiveContact(contact)}
                className={cn(
                  'flex w-full items-center justify-between rounded-input px-3 py-2 text-left text-sm',
                  activeContact?.id === contact.id
                    ? 'bg-brand text-white'
                    : 'text-[rgba(250,250,250,0.7)] hover:bg-white/[0.05]'
                )}
              >
                <span>{contact.username ?? contact.fullName ?? contact.email}</span>
                {contact.role ? (
                  <span className="text-[10px] uppercase opacity-60">{contact.role}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col">
        {!activeContact ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[rgba(250,250,250,0.4)]">
            Select someone to start a conversation.
          </div>
        ) : (
          <>
            <div className="border-b border-white/[0.07] px-4 py-3">
              <p className="text-sm font-medium text-[#FAFAFA]">
                {activeContact.username ?? activeContact.fullName ?? activeContact.email}
              </p>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {loading ? (
                <p className="text-xs text-[rgba(250,250,250,0.4)]">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-xs text-[rgba(250,250,250,0.4)]">No messages yet. Say hello!</p>
              ) : (
                messages.map((message) => {
                  const mine = message.senderId === currentUserId;
                  return (
                    <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[70%] rounded-input px-3 py-2 text-sm',
                          mine ? 'bg-brand text-white' : 'bg-white/[0.06] text-[#FAFAFA]'
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
              className="flex items-center gap-2 border-t border-white/[0.07] p-3"
            >
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button type="submit" disabled={!draft.trim()}>
                Send
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
