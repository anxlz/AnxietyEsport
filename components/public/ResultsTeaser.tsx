import Link from 'next/link';
import type { ReactElement } from 'react';
import type { Match } from '@/lib/types/database';

interface ResultsTeaserProps {
  matches: Match[];
}

function formatDate(value: string | null): string {
  if (!value) return 'TBD';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ResultsTeaser({ matches }: ResultsTeaserProps): ReactElement {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-[#FAFAFA] md:text-3xl">Recent Results</h2>

        <div className="mt-8 flex flex-col gap-3">
          {matches.length === 0 && (
            <p className="text-sm text-[rgba(250,250,250,0.3)]">No completed matches yet.</p>
          )}

          {matches.map((match) => {
            const won = match.teamScore > match.oppScore;
            return (
              <div
                key={match.id}
                className="flex items-center justify-between rounded-card border border-white/[0.07] bg-[#111114] px-5 py-4"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`rounded-badge px-2.5 py-1 text-xs font-semibold ${
                      won
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {match.teamScore}–{match.oppScore}
                  </span>
                  <span className="font-medium text-[#FAFAFA]">vs {match.opponentName}</span>
                </div>
                <span className="text-sm text-[rgba(250,250,250,0.55)]">
                  {formatDate(match.matchDate)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-right">
          <Link href="/results" className="text-sm text-[#8943F9] hover:text-[#7C3AED]">
            View all results →
          </Link>
        </div>
      </div>
    </section>
  );
}
