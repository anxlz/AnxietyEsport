'use client';

import { useRef, useState, type ReactElement, type ChangeEvent } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SupabaseImage } from '@/components/shared/SupabaseImage';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { User, UserRole } from '@/lib/types/database';

type Tab = 'profile' | 'security' | 'role';

const ROLE_LABELS: Record<Exclude<UserRole, 'admin'>, string> = {
  player: 'Player',
  manager: 'Manager',
  coach: 'Coach',
  staff: 'Staff',
};

interface LatestApplication {
  id: string;
  role: string | null;
  status: string;
  created_at: string;
}

interface ProfileSettingsClientProps {
  profile: User;
  email: string;
  discordAvatarUrl: string | null;
  latestApplication: LatestApplication | null;
}

export function ProfileSettingsClient({
  profile,
  email,
  discordAvatarUrl,
  latestApplication,
}: ProfileSettingsClientProps): ReactElement {
  const supabase = createSupabaseBrowserClient();
  const [tab, setTab] = useState<Tab>('profile');

  // Profile state
  const [displayName, setDisplayName] = useState(profile.fullName ?? '');
  const [username, setUsername] = useState(profile.username ?? '');
  const [ign, setIgn] = useState(profile.ign ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [country, setCountry] = useState(profile.country ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingSecurity, setSavingSecurity] = useState(false);

  // Role request state
  const [requestedRole, setRequestedRole] = useState<Exclude<UserRole, 'admin'>>('player');
  const [roleReason, setRoleReason] = useState('');
  const [submittingRole, setSubmittingRole] = useState(false);

  async function handleAvatarUpload(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB.');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `avatars/${profile.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      // Storage bucket may not exist yet — fall back to object URL for preview
      toast.error(`Upload failed: ${uploadError.message}. Using preview URL instead.`);
      setAvatarUrl(URL.createObjectURL(file));
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    toast.success('Avatar uploaded.');
    setUploading(false);
  }

  async function handleUseDiscordAvatar(): Promise<void> {
    if (!discordAvatarUrl) return;
    setAvatarUrl(discordAvatarUrl);
    toast.success('Discord avatar applied. Save profile to confirm.');
  }

  async function handleSaveProfile(): Promise<void> {
    setSavingProfile(true);
    const { error } = await supabase
      .from('users')
      .update({
        full_name: displayName || null,
        username: username || null,
        ign: ign || null,
        bio: bio || null,
        country: country || null,
        avatar_url: avatarUrl || null,
      })
      .eq('id', profile.id);
    setSavingProfile(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Profile saved.');
  }

  async function handleUpdateEmail(): Promise<void> {
    if (!newEmail.trim()) { toast.error('Enter a new email address.'); return; }
    setSavingSecurity(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setSavingSecurity(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Confirmation email sent to both addresses. Check your inbox.');
    setNewEmail('');
  }

  async function handleUpdatePassword(): Promise<void> {
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return; }
    setSavingSecurity(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingSecurity(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Password updated.');
    setNewPassword('');
    setConfirmPassword('');
  }

  async function handleRoleRequest(): Promise<void> {
    if (roleReason.trim().length < 30) {
      toast.error('Please write at least 30 characters explaining your reason.');
      return;
    }
    setSubmittingRole(true);

    const { error } = await supabase.from('applications').insert({
      user_id: profile.id,
      role: requestedRole,
      reason: roleReason,
      status: 'pending',
    });

    if (error) {
      toast.error(error.message);
      setSubmittingRole(false);
      return;
    }

    // Notify user themselves (so their notification bell shows it)
    await supabase.from('notifications').insert({
      user_id: profile.id,
      type: 'new_task',
      title: 'Role change request submitted',
      content: `Your request to become ${requestedRole} is pending admin review.`,
      link: '/dashboard/profile',
    });

    toast.success('Role change request submitted. You\'ll be notified when it\'s reviewed.');
    setRoleReason('');
    setSubmittingRole(false);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'security', label: 'Security' },
    { key: 'role', label: 'Role request' },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-lg font-semibold text-[#FAFAFA]">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-card border border-white/[0.07] bg-surface-card p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 rounded-input py-1.5 text-xs font-medium transition-colors',
              tab === t.key ? 'bg-brand text-white' : 'text-[rgba(250,250,250,0.55)] hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <div className="space-y-4 rounded-card border border-white/[0.07] bg-surface-card p-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white/[0.08]"
            >
              {avatarUrl ? (
                <SupabaseImage src={avatarUrl} alt="avatar" fill className="object-cover" fallbackClassName="h-full w-full bg-white/[0.08]" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xl font-bold text-[rgba(250,250,250,0.5)]">
                  {(displayName || username || '?').slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {uploading ? <LoadingSpinner size={20} /> : (
                  <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="white" strokeWidth={2}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                )}
              </span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleAvatarUpload(e)} />
            <div className="space-y-1">
              <p className="text-sm text-[rgba(250,250,250,0.7)]">Click avatar to upload</p>
              <p className="text-xs text-[rgba(250,250,250,0.4)]">JPG, PNG or WebP, max 2 MB</p>
              {discordAvatarUrl && (
                <button type="button" onClick={() => void handleUseDiscordAvatar()} className="text-xs text-[#5865F2] hover:underline">
                  Use Discord avatar
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your full name" />
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="handle" />
            </div>
            <div className="space-y-1.5">
              <Label>IGN (in-game name)</Label>
              <Input value={ign} onChange={(e) => setIgn(e.target.value)} placeholder="YourCODMName" />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="EG" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="A short bio about yourself..." />
          </div>

          <div className="flex items-center gap-2 border-t border-white/[0.07] pt-3">
            <span className="text-xs text-[rgba(250,250,250,0.4)]">Role: <span className="capitalize text-[rgba(250,250,250,0.7)]">{profile.role ?? '—'}</span></span>
            <Button onClick={() => void handleSaveProfile()} disabled={savingProfile} className="ml-auto">
              {savingProfile ? <LoadingSpinner size={14} /> : 'Save profile'}
            </Button>
          </div>
        </div>
      )}

      {/* Security tab */}
      {tab === 'security' && (
        <div className="space-y-5 rounded-card border border-white/[0.07] bg-surface-card p-5">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#FAFAFA]">Email address</h3>
            <p className="text-xs text-[rgba(250,250,250,0.5)]">Current: <span className="text-[rgba(250,250,250,0.8)]">{email}</span></p>
            <div className="flex gap-2">
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="new@email.com" className="flex-1" />
              <Button onClick={() => void handleUpdateEmail()} disabled={savingSecurity}>Update</Button>
            </div>
            <p className="text-xs text-[rgba(250,250,250,0.4)]">Supabase will send a confirmation link to both your old and new email addresses.</p>
          </div>

          <div className="space-y-3 border-t border-white/[0.07] pt-4">
            <h3 className="text-sm font-semibold text-[#FAFAFA]">Change password</h3>
            <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="New password (min 8 chars)" />
            <Input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" placeholder="Confirm new password" />
            <Button onClick={() => void handleUpdatePassword()} disabled={savingSecurity} className="w-full">
              {savingSecurity ? <LoadingSpinner size={14} /> : 'Update password'}
            </Button>
          </div>
        </div>
      )}

      {/* Role request tab */}
      {tab === 'role' && (
        <div className="space-y-4 rounded-card border border-white/[0.07] bg-surface-card p-5">
          <div>
            <h3 className="text-sm font-semibold text-[#FAFAFA]">Request a role change</h3>
            <p className="mt-1 text-xs text-[rgba(250,250,250,0.5)]">Your current role is <span className="capitalize text-[rgba(250,250,250,0.8)]">{profile.role ?? 'unassigned'}</span>. Submit a request and an admin will review it.</p>
          </div>

          {latestApplication && (
            <div className="rounded-input border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-xs text-[rgba(250,250,250,0.5)]">
              Latest application: <span className="capitalize text-[rgba(250,250,250,0.8)]">{latestApplication.role ?? '—'}</span>
              {' '}— <span className={cn('capitalize', latestApplication.status === 'approved' ? 'text-green-400' : latestApplication.status === 'rejected' ? 'text-red-400' : 'text-[#8943F9]')}>{latestApplication.status}</span>
              {' '}· {new Date(latestApplication.created_at).toLocaleDateString()}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Requested role</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(ROLE_LABELS) as [Exclude<UserRole, 'admin'>, string][]).map(([role, label]) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRequestedRole(role)}
                  className={cn(
                    'rounded-input border py-2 text-sm transition-colors',
                    requestedRole === role ? 'border-brand bg-brand/10 text-white' : 'border-white/[0.07] text-[rgba(250,250,250,0.55)] hover:border-white/[0.2]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reason for role change</Label>
            <Textarea value={roleReason} onChange={(e) => setRoleReason(e.target.value)} rows={4} placeholder="Explain why you'd like this role change..." />
            <p className="text-xs text-[rgba(250,250,250,0.4)]">{roleReason.length} / 500 characters</p>
          </div>

          <Button onClick={() => void handleRoleRequest()} disabled={submittingRole} className="w-full">
            {submittingRole ? <LoadingSpinner size={14} /> : 'Submit role request'}
          </Button>
        </div>
      )}
    </div>
  );
}
