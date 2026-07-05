'use client';

import { useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from '@/lib/toast';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function CreateRosterForm(): ReactElement {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [name, setName] = useState<string>('');
  const [game, setGame] = useState<string>('Call of Duty: Mobile');
  const [region, setRegion] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<boolean>(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !game.trim()) {
      const message = 'Name and game are required.';
      setError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);
    const { error: insertError } = await supabase.from('rosters').insert({
      name: name.trim(),
      game: game.trim(),
      slug: slugify(name),
      region: region.trim() || null,
      active: true,
    });
    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      toast.error(insertError.message);
      return;
    }

    toast.success('Roster created.');
    setName('');
    setRegion('');
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        + New roster
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-card border border-white/[0.07] bg-surface-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#FAFAFA]">New roster</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-[rgba(250,250,250,0.4)] hover:text-white">
          ✕
        </button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rosterName">Name</Label>
        <Input id="rosterName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Anxiety Esports Black" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rosterGame">Game</Label>
        <Input id="rosterGame" value={game} onChange={(e) => setGame(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rosterRegion">Region</Label>
        <Input id="rosterRegion" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="MENA" />
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? <LoadingSpinner size={14} /> : 'Create roster'}
      </Button>
    </form>
  );
}
