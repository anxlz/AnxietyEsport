'use client';

import { useState, type ReactElement } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { mapUserFromRow, type UserRow } from '@/lib/types/database-rows';
import type { Roster, User } from '@/lib/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SupabaseImage } from '@/components/shared/SupabaseImage';
import type { RosterMemberWithUser } from '@/app/dashboard/(shell)/manager/roster/page';

interface RosterMembersTableProps {
  rosters: Roster[];
  members: RosterMemberWithUser[];
}

export function RosterMembersTable({ rosters, members }: RosterMembersTableProps): ReactElement {
  const [activeRosterId, setActiveRosterId] = useState<string>(rosters[0]?.id ?? '');
  const [localMembers, setLocalMembers] = useState<RosterMemberWithUser[]>(members);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();
  const visibleMembers = localMembers.filter((m) => m.rosterId === activeRosterId);

  async function handleSearch(query: string): Promise<void> {
    setSearchQuery(query);
    setActionError(null);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const { data } = await supabase
      .from('users')
      .select('*')
      .ilike('username', `%${query}%`)
      .limit(8)
      .returns<UserRow[]>();
    setSearching(false);
    setSearchResults((data ?? []).map(mapUserFromRow));
  }

  async function handleAddPlayer(targetUser: User): Promise<void> {
    setActionError(null);
    const { data, error } = await supabase
      .from('roster_members')
      .insert({ roster_id: activeRosterId, user_id: targetUser.id, ign: targetUser.ign })
      .select()
      .single();

    if (error || !data) {
      setActionError(error?.message ?? 'Could not add player');
      return;
    }

    setLocalMembers((prev) => [
      ...prev,
      {
        memberId: data.id,
        rosterId: activeRosterId,
        userId: targetUser.id,
        ign: targetUser.ign,
        position: null,
        isCaptain: false,
        username: targetUser.username,
        fullName: targetUser.fullName,
        avatarUrl: targetUser.avatarUrl,
        country: targetUser.country,
      },
    ]);
    setModalOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }

  async function handleRemove(memberId: string): Promise<void> {
    setActionError(null);
    const { error } = await supabase.from('roster_members').delete().eq('id', memberId);
    if (error) {
      setActionError(error.message);
      return;
    }
    setLocalMembers((prev) => prev.filter((m) => m.memberId !== memberId));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-white/[0.07] pb-2">
        {rosters.map((roster) => (
          <button
            key={roster.id}
            type="button"
            onClick={() => setActiveRosterId(roster.id)}
            className={
              roster.id === activeRosterId
                ? 'rounded-input bg-brand px-3 py-1.5 text-xs font-medium text-white'
                : 'rounded-input px-3 py-1.5 text-xs text-[rgba(250,250,250,0.55)] hover:text-white'
            }
          >
            {roster.name}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#FAFAFA]">Roster members</h2>
        <Button type="button" onClick={() => setModalOpen(true)}>
          Add player
        </Button>
      </div>

      {actionError ? <p className="text-sm text-red-400">{actionError}</p> : null}

      <div className="overflow-x-auto rounded-card border border-white/[0.07] bg-surface-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] text-left text-xs text-[rgba(250,250,250,0.5)]">
              <th className="px-4 py-3">Avatar</th>
              <th className="px-4 py-3">IGN</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Captain</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleMembers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[rgba(250,250,250,0.4)]">
                  No players on this roster yet.
                </td>
              </tr>
            ) : (
              visibleMembers.map((member) => (
                <tr key={member.memberId} className="border-b border-white/[0.05] last:border-b-0">
                  <td className="px-4 py-3">
                    <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-xs uppercase text-[rgba(250,250,250,0.7)]">
                      {member.avatarUrl ? (
                        <SupabaseImage
                          src={member.avatarUrl}
                          alt={member.username ?? 'avatar'}
                          width={32}
                          height={32}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (member.username ?? '?').slice(0, 1)
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#FAFAFA]">{member.ign ?? '—'}</td>
                  <td className="px-4 py-3 text-[rgba(250,250,250,0.7)]">{member.username ?? '—'}</td>
                  <td className="px-4 py-3 text-[rgba(250,250,250,0.7)]">{member.position ?? '—'}</td>
                  <td className="px-4 py-3">{member.isCaptain ? 'Yes' : '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleRemove(member.memberId)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-card border border-white/[0.07] bg-[#111114] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#FAFAFA]">Add player</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[rgba(250,250,250,0.4)] hover:text-white"
              >
                ✕
              </button>
            </div>

            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by username"
              autoFocus
            />

            <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
              {searching ? (
                <p className="py-4 text-center text-xs text-[rgba(250,250,250,0.4)]">Searching...</p>
              ) : searchResults.length === 0 && searchQuery ? (
                <p className="py-4 text-center text-xs text-[rgba(250,250,250,0.4)]">No users found.</p>
              ) : (
                searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleAddPlayer(result)}
                    className="flex w-full items-center justify-between rounded-input px-3 py-2 text-left text-sm text-[#FAFAFA] hover:bg-white/[0.05]"
                  >
                    <span>{result.username}</span>
                    <span className="text-xs text-[rgba(250,250,250,0.4)]">{result.ign ?? ''}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
