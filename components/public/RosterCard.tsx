import Link from 'next/link';
import type { ReactElement } from 'react';
import type { Roster, RosterMember } from '@/lib/types/database';
import { SupabaseImage } from '@/components/shared/SupabaseImage';

interface RosterCardProps {
  roster: Roster;
  members?: RosterMember[];
}

export function RosterCard({ roster, members = [] }: RosterCardProps): ReactElement {
  const visibleMembers = members.slice(0, 5);

  return (
    <Link
      href={`/rosters/${roster.slug}`}
      className="group block w-72 shrink-0 overflow-hidden rounded-card border border-white/[0.07] bg-[#111114] transition-colors duration-200 hover:border-[#8943F9]/40"
    >
      <div className="relative h-36 w-full bg-[#1A1A1F]">
        <SupabaseImage
          src={roster.coverUrl}
          alt={`${roster.name} cover`}
          fill
          className="object-cover"
          fallbackClassName="h-full w-full bg-[#1A1A1F]"
        />
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-[#FAFAFA]">{roster.name}</h3>
          {roster.region && (
            <span className="rounded-badge border border-white/[0.1] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[rgba(250,250,250,0.55)]">
              {roster.region}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-[#8943F9]">{roster.game}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex">
            {visibleMembers.length === 0 && (
              <span className="text-xs text-[rgba(250,250,250,0.3)]">No players yet</span>
            )}
            {visibleMembers.map((member, index) => (
              <span
                key={member.id}
                className="h-7 w-7 overflow-hidden rounded-full border-2 border-[#111114] bg-[#1A1A1F]"
                style={{ marginLeft: index === 0 ? 0 : -6 }}
              >
                <SupabaseImage
                  src={member.proImageUrl}
                  alt={member.ign ?? 'Player'}
                  width={28}
                  height={28}
                  className="h-full w-full object-cover"
                  fallbackClassName="h-full w-full bg-[#1A1A1F]"
                />
              </span>
            ))}
          </div>
          <span className="text-sm text-[rgba(250,250,250,0.55)] transition-colors group-hover:text-[#8943F9]">
            View Roster →
          </span>
        </div>
      </div>
    </Link>
  );
}

export function RosterCardSkeleton(): ReactElement {
  return (
    <div className="w-72 shrink-0 overflow-hidden rounded-card border border-white/[0.07] bg-[#111114]">
      <div className="h-36 w-full animate-pulse bg-[#1A1A1F]" />
      <div className="p-4">
        <div className="h-4 w-2/3 animate-pulse rounded-badge bg-white/[0.07]" />
        <div className="mt-2 h-3 w-1/3 animate-pulse rounded-badge bg-white/[0.07]" />
        <div className="mt-4 flex items-center justify-between">
          <div className="flex">
            {[0, 1, 2, 3, 4].map((index) => (
              <span
                key={index}
                className="h-7 w-7 animate-pulse rounded-full border-2 border-[#111114] bg-white/[0.07]"
                style={{ marginLeft: index === 0 ? 0 : -6 }}
              />
            ))}
          </div>
          <div className="h-3 w-16 animate-pulse rounded-badge bg-white/[0.07]" />
        </div>
      </div>
    </div>
  );
}
