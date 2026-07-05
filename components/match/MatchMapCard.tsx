import type { CSSProperties, ReactElement } from 'react';
import type { CodmMode, MatchMapStatus } from '@/lib/types/database';

export interface MatchMapCardProps {
  mapName: string;
  mode: CodmMode | null;
  teamScore: number | null;
  oppScore: number | null;
  status: MatchMapStatus;
  mapImageUrl: string | null;
  orderNum: number;
  teamName?: string;
  oppName?: string;
}

function backgroundStyle(mapImageUrl: string | null): CSSProperties {
  if (!mapImageUrl) {
    return {};
  }
  return {
    backgroundImage: `url(${mapImageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

export function MatchMapCard({
  mapName,
  mode,
  teamScore,
  oppScore,
  status,
  mapImageUrl,
  orderNum,
}: MatchMapCardProps): ReactElement {
  if (status === 'skipped') {
    return (
      <div className="relative flex h-48 w-36 items-center justify-center overflow-hidden rounded-card border border-white/[0.07] bg-[#13131A]/60">
        <span className="text-sm text-[rgba(250,250,250,0.3)]">—</span>
      </div>
    );
  }

  const played = status === 'played';
  const hasScores = teamScore !== null && oppScore !== null;
  const teamWon = played && hasScores && teamScore! > oppScore!;
  const teamLost = played && hasScores && teamScore! < oppScore!;

  return (
    <div
      className="relative h-48 w-36 overflow-hidden rounded-card"
      style={mapImageUrl ? backgroundStyle(mapImageUrl) : undefined}
    >
      {!mapImageUrl ? <div className="absolute inset-0 bg-[#1A1A1F]" /> : null}

      <div
        className={
          played
            ? 'absolute inset-0 bg-black/50'
            : 'absolute inset-0 bg-black/70 grayscale'
        }
      />

      {/* Order number badge */}
      <span className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-medium text-white">
        {orderNum}
      </span>

      {/* Won/Lost badge */}
      {played && hasScores ? (
        <span
          className={
            teamWon
              ? 'absolute right-2 top-2 rounded-badge bg-green-500/20 px-1.5 py-0.5 text-[10px] text-green-400'
              : teamLost
              ? 'absolute right-2 top-2 rounded-badge bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400'
              : 'absolute right-2 top-2 rounded-badge bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60'
          }
        >
          {teamWon ? 'WON' : teamLost ? 'LOST' : 'TIE'}
        </span>
      ) : null}

      {/* Score */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
        {hasScores ? (
          <p className={played ? 'text-4xl font-black text-white' : 'text-2xl text-white/40'}>
            <span className={teamWon ? 'text-brand' : ''}>{teamScore}</span>
            {' — '}
            <span className={teamLost ? 'text-brand' : ''}>{oppScore}</span>
          </p>
        ) : (
          <p className="text-sm text-white/40">TBD</p>
        )}
      </div>

      {/* Map info */}
      <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
        <p className="truncate text-sm font-bold uppercase text-white">{mapName}</p>
        <p className="text-xs text-white/60">{mode ?? '—'}</p>
      </div>
    </div>
  );
}

export interface MatchMapCardRowProps {
  mapName: string;
  mode: CodmMode | null;
  teamScore: number | null;
  oppScore: number | null;
  mapImageUrl: string | null;
}

export function MatchMapCardRow({
  mapName,
  mode,
  teamScore,
  oppScore,
  mapImageUrl,
}: MatchMapCardRowProps): ReactElement {
  const hasScores = teamScore !== null && oppScore !== null;

  return (
    <div className="flex items-center gap-4 rounded-card border border-white/[0.07] bg-[#111114] p-4">
      <div
        className="h-12 w-12 shrink-0 rounded-input bg-[#1A1A1F] bg-cover bg-center"
        style={mapImageUrl ? backgroundStyle(mapImageUrl) : undefined}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#FAFAFA]">{mapName}</p>
        <p className="text-xs text-[rgba(250,250,250,0.5)]">{mode ?? '—'}</p>
      </div>
      <span className="text-sm font-semibold text-[#FAFAFA]">
        {hasScores ? `${teamScore} — ${oppScore}` : 'TBD'}
      </span>
    </div>
  );
}
