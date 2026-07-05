'use client';

import { useState, useEffect, Suspense, type FormEvent, type ReactElement } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from '@/lib/toast';

function LoginForm(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [discordLoading, setDiscordLoading] = useState<boolean>(false);

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      const message = oauthError === 'missing_code' || oauthError === 'missing_env'
        ? 'Discord sign-in failed. Please try again.'
        : oauthError;
      setError(message);
      toast.error(message);
    }
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      toast.error(signInError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  async function handleDiscordSignIn(): Promise<void> {
    setError(null);
    setDiscordLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      toast.error(oauthError.message);
      setDiscordLoading(false);
    }
    // On success, Supabase redirects the browser to Discord — nothing left to do here.
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md rounded-card border border-white/[0.07] bg-[#111114] p-8"
    >
      <div className="flex flex-col items-center text-center">
        <span className="h-7 w-7 rounded-[6px] bg-[#8943F9]" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold text-[#FAFAFA]">Welcome back</h1>
      </div>

      {error && (
        <div className="mt-6 rounded-input border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-[rgba(250,250,250,0.55)]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="text-[rgba(250,250,250,0.55)]">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA] pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[rgba(250,250,250,0.55)] hover:text-[#FAFAFA]"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 bg-[#8943F9] text-white hover:bg-[#7C3AED] disabled:opacity-60"
        >
          {loading && <LoadingSpinner size={16} />}
          Sign in
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/[0.07]" />
        <span className="text-xs text-[rgba(250,250,250,0.4)]">or</span>
        <span className="h-px flex-1 bg-white/[0.07]" />
      </div>

      <Button
        type="button"
        onClick={handleDiscordSignIn}
        disabled={discordLoading}
        className="mt-4 flex w-full items-center justify-center gap-2 border border-white/[0.1] bg-[#5865F2] text-white hover:bg-[#4752C4] disabled:opacity-60"
      >
        {discordLoading ? (
          <LoadingSpinner size={16} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.291a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
          </svg>
        )}
        Continue with Discord
      </Button>

      <p className="mt-6 text-center text-sm text-[rgba(250,250,250,0.55)]">
        Don&apos;t have an account?{' '}
        <Link href="/apply" className="text-[#8943F9] hover:text-[#7C3AED]">
          Apply to join →
        </Link>
      </p>
    </motion.div>
  );
}

export default function LoginPage(): ReactElement {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
