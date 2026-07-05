import type { ReactElement } from 'react';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  mapRosterFromRow,
  mapRosterMemberFromRow,
  type RosterRow,
  type RosterMemberRow,
} from '@/lib/types/database-rows';
import { SupabaseImage } from '@/components/shared/SupabaseImage';

interface RosterDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function RosterDetailPage({ params }: RosterDetailPageProps): Promise<ReactElement> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: rosterRow } = await supabase
    .from('rosters')
    .select('*')
    .eq('slug', slug)
    .single<RosterRow>();

  if (!rosterRow) {
    notFound();
  }

  const roster = mapRosterFromRow(rosterRow);

  const { data: memberRows } = await supabase
    .from('roster_members')
    .select('*')
    .eq('roster_id', roster.id)
    .returns<RosterMemberRow[]>();

  const members = (memberRows ?? []).map(mapRosterMemberFromRow);

  return (
    <main>
      <div className="relative h-64 w-full bg-[#13131A] md:h-80">
        <SupabaseImage
          src={roster.coverUrl}
          alt={`${roster.name} cover`}
          fill
          className="object-cover"
          fallbackClassName="h-full w-full bg-[#13131A]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-[#FAFAFA] md:text-4xl">{roster.name}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <span style={{ color: roster.accentColor }}>{roster.game}</span>
            {roster.region ? (
              <span className="rounded-badge border border-white/[0.1] px-2 py-0.5 text-xs uppercase text-[rgba(250,250,250,0.55)]">
                {roster.region}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {roster.description ? (
          <p className="mb-10 max-w-2xl text-[rgba(250,250,250,0.65)]">{roster.description}</p>
        ) : null}

        <h2 className="mb-6 text-xl font-semibold text-[#FAFAFA]">Players</h2>

        {members.length === 0 ? (
          <p className="text-sm text-[rgba(250,250,250,0.4)]">No players have been added to this roster yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {members.map((member) => (
              <div
                key={member.id}
                className="group overflow-hidden rounded-card border border-white/[0.07] bg-[#111114] transition-colors hover:border-[#8943F9]/40"
              >
                <div className="relative aspect-square w-full bg-[#1A1A1F]">
                  <SupabaseImage
                    src={member.proImageUrl}
                    alt={member.ign ?? 'Player'}
                    fill
                    className="object-cover"
                    fallbackClassName="h-full w-full bg-[#1A1A1F]"
                  />
                  {member.isCaptain ? (
                    <span className="absolute right-2 top-2 rounded-badge bg-[#8943F9] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      C
                    </span>
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="truncate font-semibold text-[#FAFAFA]">{member.ign ?? 'Unnamed'}</p>
                  <p className="text-xs text-[rgba(250,250,250,0.5)]">
                    {member.position ?? '—'}
                    {member.jerseyNumber !== null ? ` · #${member.jerseyNumber}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
