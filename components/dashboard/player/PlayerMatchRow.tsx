'use client';

import { useState, type ReactElement } from 'react';
import type { Match, MatchMap } from '@/lib/types/database';
import { MatchMapCard } from '@/components/match/MatchMapCard';

interface PlayerMatchRowProps {
  match: Match;
  maps: MatchMap[];
}

export function PlayerMatchRow({ match, maps }: PlayerMatchRowProps): ReactElement {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <div className="rounded-card border border-white/[0.07] bg-surface-card">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#FAFAFA]">vs {match.opponentName}</p>
          <p className="text-xs text-[rgba(250,250,250,0.5)]">
            {[match.tournament, match.matchDate ? new Date(match.matchDate).toLocaleDateString() : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {match.status === 'completed' ? (
            <span
              className={
                match.teamScore > match.oppScore
                  ? 'rounded-badge bg-green-500/15 px-2 py-0.5 text-xs text-green-400'
                  : 'rounded-badge bg-red-500/15 px-2 py-0.5 text-xs text-red-400'
              }
            >
              {match.teamScore}–{match.oppScore}
            </span>
          ) : null}
          <svg
            viewBox="0 0 24 24"
            width={16}
            height={16}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            className={`text-[rgba(250,250,250,0.4)] transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {open ? (
        <div className="flex gap-4 overflow-x-auto border-t border-white/[0.07] px-4 py-4">
          {maps.length === 0 ? (
            <p className="text-sm text-[rgba(250,250,250,0.4)]">No maps recorded for this match.</p>
          ) : (
            maps.map((map) => (
              <MatchMapCard
                key={map.id}
                mapName={map.mapName}
                mode={map.mode}
                teamScore={map.teamScore}
                oppScore={map.oppScore}
                status={map.status}
                mapImageUrl={map.mapImageUrl}
                orderNum={map.orderNum}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
