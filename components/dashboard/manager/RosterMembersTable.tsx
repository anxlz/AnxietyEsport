'use client';

import { useState, type ReactElement } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { mapUserFromRow, type UserRow } from '@/lib/types/database-rows';
import type { Roster, User, UserRole } from '@/lib/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SupabaseImage } from '@/components/shared/SupabaseImage';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { RosterMemberWithUser } from '@/app/dashboard/(shell)/manager/roster/page';

interface RosterMembersTableProps {
  rosters: Roster[];
  members: RosterMemberWithUser[];
}

const RECRUITABLE_ROLES: Exclude<UserRole, 'admin' | 'staff'>[] = ['player', 'manager', 'coach'];

const ROLE_BADGE: Record<string, string> = {
  player: 'bg-[#8943F9]/15 text-[#8943F9]',
  manager: 'bg-blue-500/15 text-blue-400',
  coach: 'bg-amber-500/15 text-amber-400',
};

export function RosterMembersTable({ rosters, members }: RosterMembersTableProps): ReactElement {
  const [activeRosterId, setActiveRosterId] = useState<string>(rosters[0]?.id ?? '');
  const [localMembers, setLocalMembers] = useState<RosterMemberWithUser[]>(members);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [recruiterRole, setRecruiterRole] = useState<Exclude<UserRole, 'admin' | 'staff'>>('player');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();
  const visibleMembers = localMembers.filter((m) => m.rosterId === activeRosterId);

  async function handleSearch(query: string): Promise<void> {
    setSearchQuery(query);
    setActionError(null);
    if (!query.trim()) { setSearchResults([]); return; }

    setSearching(true);
    const { data } = await supabase
      .from('users')
      .select('*')
      .ilike('username', `%${query}%`)
      .eq('role', recruiterRole)
      .eq('status', 'approved')
      .limit(8)
      .returns<UserRow[]>();
    setSearching(false);
    setSearchResults((data ?? []).map(mapUserFromRow));
  }

  async function handleAddRecruiter(targetUser: User): Promise<void> {
    setActionError(null);

    // Check not already on this roster
    if (localMembers.some((m) => m.rosterId === activeRosterId && m.userId === targetUser.id)) {
      toast.error(`${targetUser.username ?? targetUser.fullName ?? 'This user'} is already on this roster.`);
      return;
    }

    const { data, error } = await supabase
      .from('roster_members')
      .insert({ roster_id: activeRosterId, user_id: targetUser.id, ign: targetUser.ign })
      .select()
      .single();

    if (error || !data) {
      const message = error?.message ?? 'Could not add member';
      setActionError(message);
      toast.error(message);
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

    toast.success(`${targetUser.username ?? targetUser.fullName ?? 'User'} added to roster.`);
    setModalOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }

  async function handleRemove(memberId: string): Promise<void> {
    setActionError(null);
    const { error } = await supabase.from('roster_members').delete().eq('id', memberId);
    if (error) { setActionError(error.message); toast.error(error.message); return; }
    setLocalMembers((prev) => prev.filter((m) => m.memberId !== memberId));
    toast.success('Member removed from roster.');
  }

  return (
    <div className="space-y-4">
      {/* Roster tabs */}
      <div className="flex gap-2 border-b border-white/[0.07] pb-2">
        {rosters.map((roster) => (
          <button
            key={roster.id}
            type="button"
            onClick={() => setActiveRosterId(roster.id)}
            className={roster.id === activeRosterId
              ? 'rounded-input bg-brand px-3 py-1.5 text-xs font-medium text-white'
              : 'rounded-input px-3 py-1.5 text-xs text-[rgba(250,250,250,0.55)] hover:text-white'}
          >
            {roster.name}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#FAFAFA]">Roster members</h2>
        <Button type="button" onClick={() => setModalOpen(true)}>Add recruiter</Button>
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
              <tr><td colSpan={6} className="px-4 py-6 text-center text-[rgba(250,250,250,0.4)]">No members on this roster yet.</td></tr>
            ) : (
              visibleMembers.map((member) => (
                <tr key={member.memberId} className="border-b border-white/[0.05] last:border-b-0">
                  <td className="px-4 py-3">
                    <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-xs uppercase text-[rgba(250,250,250,0.7)]">
                      {member.avatarUrl ? (
                        <SupabaseImage src={member.avatarUrl} alt={member.username ?? 'avatar'} width={32} height={32} className="h-full w-full object-cover" />
                      ) : (member.username ?? '?').slice(0, 1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#FAFAFA]">{member.ign ?? '—'}</td>
                  <td className="px-4 py-3 text-[rgba(250,250,250,0.7)]">{member.username ?? '—'}</td>
                  <td className="px-4 py-3 text-[rgba(250,250,250,0.7)]">{member.position ?? '—'}</td>
                  <td className="px-4 py-3">{member.isCaptain ? 'Yes' : '—'}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => void handleRemove(member.memberId)} className="text-xs text-red-400 hover:underline">Remove</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add recruiter modal */}
      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-4 rounded-card border border-white/[0.07] bg-[#111114] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#FAFAFA]">Add recruiter</h3>
              <button type="button" onClick={() => { setModalOpen(false); setSearchQuery(''); setSearchResults([]); }} className="text-[rgba(250,250,250,0.4)] hover:text-white">✕</button>
            </div>

            {/* Role selector */}
            <div className="space-y-1.5">
              <p className="text-xs text-[rgba(250,250,250,0.5)]">Role</p>
              <div className="flex gap-2">
                {RECRUITABLE_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => { setRecruiterRole(role); setSearchQuery(''); setSearchResults([]); }}
                    className={cn(
                      'flex-1 rounded-input px-3 py-1.5 text-xs capitalize transition-colors',
                      recruiterRole === role ? 'bg-brand text-white' : 'border border-white/[0.1] text-[rgba(250,250,250,0.55)] hover:text-white'
                    )}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <Input
              value={searchQuery}
              onChange={(e) => void handleSearch(e.target.value)}
              placeholder={`Search ${recruiterRole}s by username…`}
              autoFocus
            />

            <div className="max-h-64 space-y-1 overflow-y-auto">
              {searching ? (
                <p className="py-4 text-center text-xs text-[rgba(250,250,250,0.4)]">Searching…</p>
              ) : searchResults.length === 0 && searchQuery ? (
                <p className="py-4 text-center text-xs text-[rgba(250,250,250,0.4)]">No approved {recruiterRole}s found.</p>
              ) : (
                searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => void handleAddRecruiter(result)}
                    className="flex w-full items-center gap-3 rounded-input px-3 py-2 text-left hover:bg-white/[0.05]"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-xs uppercase text-[rgba(250,250,250,0.7)]">
                      {result.avatarUrl ? (
                        <SupabaseImage src={result.avatarUrl} alt={result.username ?? ''} width={28} height={28} className="h-full w-full object-cover" />
                      ) : (result.username ?? '?').slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[#FAFAFA]">{result.username ?? result.fullName}</p>
                      <p className="text-xs text-[rgba(250,250,250,0.4)]">{result.ign ?? ''}</p>
                    </div>
                    <span className={cn('rounded-badge px-1.5 py-0.5 text-[10px] capitalize', ROLE_BADGE[result.role ?? ''] ?? 'bg-white/[0.08] text-white')}>
                      {result.role}
                    </span>
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
