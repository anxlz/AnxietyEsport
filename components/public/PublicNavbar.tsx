'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/rosters', label: 'Rosters' },
  { href: '/results', label: 'Results' },
  { href: '/news', label: 'News' },
];

export function PublicNavbar(): React.ReactElement {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function loadUser(): Promise<void> {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      setLoadingUser(false);
    }

    void loadUser();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#09090B]/80 backdrop-blur-md border-b border-white/[0.07]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-[6px] bg-[#8943F9]" aria-hidden="true" />
            <span className="text-sm font-bold tracking-wide text-[#FAFAFA]">ANXIETY ESPORTS</span>
          </Link>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative pb-1 text-sm transition-colors ${
                    isActive
                      ? 'text-[#FAFAFA] border-b-2 border-[#8943F9]'
                      : 'text-[rgba(250,250,250,0.55)] hover:text-[#FAFAFA]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {!loadingUser && !user && (
              <>
                <Link href="/apply">
                  <Button
                    variant="outline"
                    className="border-white/[0.15] bg-transparent text-[#FAFAFA] hover:bg-white/[0.05]"
                  >
                    Apply
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="bg-[#8943F9] hover:bg-[#7C3AED] text-white">Login</Button>
                </Link>
              </>
            )}
            {!loadingUser && user && (
              <>
                <span
                  className="h-8 w-8 rounded-full bg-[#8943F9]/30 border border-white/[0.1]"
                  aria-hidden="true"
                />
                <Link href="/dashboard">
                  <Button className="bg-[#8943F9] hover:bg-[#7C3AED] text-white">Dashboard</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-2 text-[#FAFAFA]"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              {mobileOpen ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <path
                  d="M3 6h18M3 12h18M3 18h18"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden border-b border-white/[0.07] bg-[#09090B]/95 backdrop-blur-md transition-all duration-300 ${
          mobileOpen ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <nav className="flex flex-col gap-1 px-4 py-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`rounded-[8px] px-3 py-2 text-sm ${
                pathname === link.href
                  ? 'bg-[#8943F9]/10 text-[#FAFAFA]'
                  : 'text-[rgba(250,250,250,0.55)] hover:bg-white/[0.05] hover:text-[#FAFAFA]'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2">
            {!loadingUser && !user && (
              <>
                <Link href="/apply" onClick={() => setMobileOpen(false)}>
                  <Button
                    variant="outline"
                    className="w-full border-white/[0.15] bg-transparent text-[#FAFAFA] hover:bg-white/[0.05]"
                  >
                    Apply
                  </Button>
                </Link>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full bg-[#8943F9] hover:bg-[#7C3AED] text-white">
                    Login
                  </Button>
                </Link>
              </>
            )}
            {!loadingUser && user && (
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button className="w-full bg-[#8943F9] hover:bg-[#7C3AED] text-white">
                  Dashboard
                </Button>
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
