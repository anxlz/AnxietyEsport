'use client';

import { useMemo, useState, type ReactElement } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { User, UserRole, UserStatus } from '@/lib/types/database';

interface UsersTableProps {
  users: User[];
}

const ROLES: UserRole[] = ['player', 'manager', 'coach', 'staff', 'admin'];
const STATUS_BADGE: Record<UserStatus, string> = {
  pending: 'bg-[#8943F9]/15 text-[#8943F9]',
  approved: 'bg-green-500/15 text-green-400',
  rejected: 'bg-red-500/15 text-red-400',
  suspended: 'bg-red-500/15 text-red-400',
};

export function UsersTable({ users: initialUsers }: UsersTableProps): ReactElement {
  const supabase = createSupabaseBrowserClient();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [query, setQuery] = useState<string>('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.username ?? '').toLowerCase().includes(q) ||
        (u.fullName ?? '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, query]);

  async function updateRole(id: string, role: UserRole): Promise<void> {
    setSavingId(id);
    const { error } = await supabase.from('users').update({ role }).eq('id', id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    toast.success('Role updated.');
  }

  async function toggleSuspend(user: User): Promise<void> {
    const newStatus: UserStatus = user.status === 'suspended' ? 'approved' : 'suspended';
    setSavingId(user.id);
    const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', user.id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)));
    toast.success(newStatus === 'suspended' ? 'User suspended.' : 'User reinstated.');
  }

  return (
    <div className="space-y-4">
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, username, or email..." />

      <div className="overflow-x-auto rounded-card border border-white/[0.07] bg-surface-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] text-left text-xs text-[rgba(250,250,250,0.5)]">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[rgba(250,250,250,0.4)]">
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-b border-white/[0.05] last:border-b-0">
                  <td className="px-4 py-3 text-[#FAFAFA]">{u.fullName ?? u.username ?? '—'}</td>
                  <td className="px-4 py-3 text-[rgba(250,250,250,0.7)]">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role ?? ''}
                      onChange={(e) => updateRole(u.id, e.target.value as UserRole)}
                      disabled={savingId === u.id}
                      className="rounded-input border border-white/[0.1] bg-surface-elevated px-2 py-1 text-xs text-[#FAFAFA]"
                    >
                      <option value="" disabled>
                        Unassigned
                      </option>
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-badge px-2 py-0.5 text-xs font-medium', STATUS_BADGE[u.status])}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSuspend(u)}
                      disabled={savingId === u.id}
                      className="text-xs text-red-400 hover:underline disabled:opacity-50"
                    >
                      {u.status === 'suspended' ? 'Reinstate' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
