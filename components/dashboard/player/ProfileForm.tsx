'use client';

import { useState, type ReactElement } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SupabaseImage } from '@/components/shared/SupabaseImage';
import { toast } from '@/lib/toast';
import type { User } from '@/lib/types/database';

interface ProfileFormProps {
  profile: User;
}

const BIO_MAX_LENGTH = 200;

export function ProfileForm({ profile }: ProfileFormProps): ReactElement {
  const [fullName, setFullName] = useState<string>(profile.fullName ?? '');
  const [ign, setIgn] = useState<string>(profile.ign ?? '');
  const [bio, setBio] = useState<string>(profile.bio ?? '');
  const [country, setCountry] = useState<string>(profile.country ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatarUrl ?? '');
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  async function handleSave(): Promise<void> {
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        full_name: fullName || null,
        ign: ign || null,
        bio: bio || null,
        country: country || null,
        avatar_url: avatarUrl || null,
      })
      .eq('id', profile.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      toast.error(updateError.message);
      return;
    }

    setSaved(true);
    toast.success('Profile updated.');
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-xl space-y-4 rounded-card border border-white/[0.07] bg-surface-card p-6">
      <div>
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="username">Username</Label>
        <Input id="username" value={profile.username ?? ''} readOnly disabled />
      </div>

      <div>
        <Label htmlFor="ign">IGN (in-game name)</Label>
        <Input id="ign" value={ign} onChange={(e) => setIgn(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          maxLength={BIO_MAX_LENGTH}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
        />
        <p className="mt-1 text-right text-xs text-[rgba(250,250,250,0.4)]">
          {bio.length}/{BIO_MAX_LENGTH}
        </p>
      </div>

      <div>
        <Label htmlFor="country">Country</Label>
        <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="avatarUrl">Avatar URL</Label>
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/[0.08]">
            <SupabaseImage
              src={avatarUrl || null}
              alt="Avatar preview"
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </span>
          <Input id="avatarUrl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
        </div>
        {/* TODO: replace URL input with direct upload to Supabase Storage in a later phase */}
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
        {saved ? <span className="text-sm text-green-400">✓ Saved</span> : null}
      </div>
    </div>
  );
}
