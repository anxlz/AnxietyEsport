import type { ReactElement } from 'react';

export default function NewsPage(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 pt-20 text-center sm:px-6 lg:px-8">
      <span className="rounded-full border border-white/[0.1] bg-white/[0.05] px-3 py-1 text-xs text-[#8943F9]">
        Coming soon
      </span>
      <h1 className="mt-4 text-3xl font-bold text-[#FAFAFA] md:text-4xl">News &amp; Announcements</h1>
      <p className="mt-3 max-w-md text-[rgba(250,250,250,0.55)]">
        Roster moves, tournament results, and team announcements will be posted here. Check back soon.
      </p>
    </main>
  );
}
