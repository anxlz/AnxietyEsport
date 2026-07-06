'use client';

import { useState, useEffect, Suspense, type ReactElement } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast, errorMessage } from '@/lib/toast';
import type { UserRole } from '@/lib/types/database';

type ApplicantRole = Exclude<UserRole, 'admin'>;

interface RoleOption {
  role: ApplicantRole;
  label: string;
  description: string;
  icon: ReactElement;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'player',
    label: 'Player',
    description: 'Compete on a roster in scrims and tournaments.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="8" r="4" strokeWidth="1.7" />
        <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    role: 'manager',
    label: 'Manager',
    description: 'Run roster logistics, scheduling, and operations.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="4" width="18" height="14" rx="2" strokeWidth="1.7" />
        <path d="M3 9h18" strokeWidth="1.7" />
      </svg>
    ),
  },
  {
    role: 'coach',
    label: 'Coach',
    description: 'Develop strategy and review match performance.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 19V5a1 1 0 0 1 1-1h11l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" strokeWidth="1.7" />
        <path d="M8 9h8M8 13h5" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    role: 'staff',
    label: 'Staff',
    description: 'Support media, content, and admin operations.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="3" strokeWidth="1.7" />
        <path
          d="M19.4 13a7.97 7.97 0 0 0 0-2l2-1.5-2-3.4-2.3.9a8 8 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a8 8 0 0 0-1.7 1l-2.3-.9-2 3.4 2 1.5a7.97 7.97 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a8 8 0 0 0 1.7 1l.3 2.5h4l.3-2.5a8 8 0 0 0 1.7-1l2.3.9 2-3.4Z"
          strokeWidth="1.3"
        />
      </svg>
    ),
  },
];

interface FormState {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: ApplicantRole | null;
  reason: string;
  experience: string;
  twitter: string;
  youtube: string;
  discord: string;
}

const INITIAL_FORM: FormState = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: null,
  reason: '',
  experience: '',
  twitter: '',
  youtube: '',
  discord: '',
};

type FormErrors = Partial<Record<keyof FormState, string>>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const DISCORD_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.291a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03Z" />
  </svg>
);

function ApplyForm(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Discord prefill — set when the callback route redirects a new Discord
  // user here after OAuth. The session already exists; we skip email/password
  // fields and jump straight to step 2 (role + reason).
  const isDiscordPrefill = searchParams.get('discord') === '1';
  const discordId = searchParams.get('discordId') ?? '';
  const avatarUrl = searchParams.get('avatarUrl') ?? '';

  const [step, setStep] = useState<number>(isDiscordPrefill ? 2 : 1);
  const [form, setForm] = useState<FormState>({
    ...INITIAL_FORM,
    fullName: searchParams.get('fullName') ?? '',
    username: searchParams.get('username') ?? '',
    email: searchParams.get('email') ?? '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [discordLoading, setDiscordLoading] = useState<boolean>(false);

  // If we landed here from Discord OAuth, show a banner.
  const showDiscordBanner = isDiscordPrefill && !!form.email;

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'fullName' && !prev.username) {
        next.username = slugify(value as string);
      }
      return next;
    });
  }

  async function handleFillWithDiscord(): Promise<void> {
    setDiscordLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        scopes: 'identify email',
      },
    });
    if (error) {
      toast.error(error.message);
      setDiscordLoading(false);
    }
    // On success the browser navigates away to Discord; callback handles the rest.
  }

  function validateStep1(): FormErrors {
    const stepErrors: FormErrors = {};
    if (!form.fullName.trim()) stepErrors.fullName = 'Full name is required.';
    if (!form.username.trim()) stepErrors.username = 'Username is required.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) stepErrors.email = 'Enter a valid email.';
    if (form.password.length < 8) stepErrors.password = 'Password must be at least 8 characters.';
    if (form.confirmPassword !== form.password) stepErrors.confirmPassword = 'Passwords do not match.';
    return stepErrors;
  }

  function validateStep2(): FormErrors {
    const stepErrors: FormErrors = {};
    if (!form.role) stepErrors.role = 'Select a role to apply for.';
    if (form.reason.trim().length < 50) stepErrors.reason = 'Please write at least 50 characters.';
    return stepErrors;
  }

  function handleNext(): void {
    const stepErrors = step === 1 ? validateStep1() : validateStep2();
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) {
      setStep((s) => Math.min(s + 1, 3));
    }
  }

  function handleBack(): void {
    setErrors({});
    // Discord-prefill users skip step 1 (no email/password needed).
    setStep((s) => Math.max(s - 1, isDiscordPrefill ? 2 : 1));
  }

  async function handleSubmit(): Promise<void> {
    setSubmitError(null);
    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();

    if (isDiscordPrefill) {
      // The auth.users row already exists (created during OAuth).
      // We just need to update public.users with the profile info and
      // insert the application row via the trigger or directly.
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const message = 'Session expired. Please sign in with Discord again.';
        setSubmitError(message);
        toast.error(message);
        setSubmitting(false);
        return;
      }

      // Update the public.users row (created by trigger with minimal data).
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: form.username || null,
          full_name: form.fullName || null,
          discord_id: discordId || null,
          avatar_url: avatarUrl || null,
        })
        .eq('id', user.id);

      if (updateError) {
        const message = errorMessage(updateError, 'Could not save your profile.');
        setSubmitError(message);
        toast.error(message);
        setSubmitting(false);
        return;
      }

      // Insert the application row (trigger only creates it on signUp,
      // not on OAuth sign-in, so we need to do it manually here).
      const { error: appError } = await supabase.from('applications').upsert(
        {
          user_id: user.id,
          role: form.role,
          reason: form.reason,
          experience: form.experience || null,
          social_links: {
            twitter: form.twitter || undefined,
            youtube: form.youtube || undefined,
            discord: form.discord || undefined,
          },
          status: 'pending',
        },
        { onConflict: 'user_id' }
      );

      if (appError) {
        const message = errorMessage(appError, 'Could not submit your application.');
        setSubmitError(message);
        toast.error(message);
        setSubmitting(false);
        return;
      }

      toast.success('Application submitted!');
      router.push('/apply/status');
      return;
    }

    // Standard email/password signup flow.
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          username: form.username,
          role: form.role,
          reason: form.reason,
          experience: form.experience || undefined,
          social_links: {
            twitter: form.twitter || undefined,
            youtube: form.youtube || undefined,
            discord: form.discord || undefined,
          },
        },
      },
    });

    if (error) {
      const message = errorMessage(error, 'Could not submit your application.');
      setSubmitError(message);
      toast.error(message);
      setSubmitting(false);
      return;
    }

    // Detect duplicate email (Supabase anti-enumeration behaviour).
    const identities = data.user?.identities ?? [];
    if (data.user && identities.length === 0) {
      const message = 'An account with this email already exists. Try logging in instead.';
      setSubmitError(message);
      toast.error(message);
      setSubmitting(false);
      return;
    }

    toast.success('Application submitted!');
    router.push('/apply/status');
  }

  const stepCount = isDiscordPrefill ? 2 : 3; // steps 2 & 3 only for Discord users
  const stepDots = isDiscordPrefill ? [2, 3] : [1, 2, 3];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-lg rounded-card border border-white/[0.07] bg-[#111114] p-8"
    >
      {/* Step dots */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {stepDots.map((dot) => (
          <span
            key={dot}
            className={`h-1.5 w-8 rounded-full transition-colors ${
              dot <= step ? 'bg-[#8943F9]' : 'bg-white/[0.1]'
            }`}
          />
        ))}
      </div>

      {/* Discord prefill banner */}
      {showDiscordBanner && (
        <div className="mb-4 flex items-center gap-3 rounded-input border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-3">
          <span className="text-[#5865F2]">{DISCORD_SVG}</span>
          <div>
            <p className="text-sm font-medium text-[#FAFAFA]">Signed in with Discord</p>
            <p className="text-xs text-[rgba(250,250,250,0.55)]">
              Account details pre-filled from your Discord profile. Just pick a role and write your reason.
            </p>
          </div>
        </div>
      )}

      {submitError && (
        <div className="mb-4 rounded-input border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {submitError}
        </div>
      )}

      {/* Step 1 — Account details (email/password signup only) */}
      {step === 1 && !isDiscordPrefill && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-[#FAFAFA]">Account details</h1>
          </div>

          {/* Fill with Discord button */}
          <button
            type="button"
            onClick={handleFillWithDiscord}
            disabled={discordLoading}
            className="flex w-full items-center justify-center gap-2 rounded-input border border-[#5865F2]/40 bg-[#5865F2]/10 py-2.5 text-sm font-medium text-[#7289DA] transition-colors hover:bg-[#5865F2]/20 disabled:opacity-60"
          >
            {discordLoading ? <LoadingSpinner size={16} /> : DISCORD_SVG}
            {discordLoading ? 'Redirecting to Discord…' : 'Fill with Discord'}
          </button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-xs text-[rgba(250,250,250,0.4)]">or fill manually</span>
            <span className="h-px flex-1 bg-white/[0.07]" />
          </div>

          <Field label="Full name" error={errors.fullName}>
            <Input
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>

          <Field label="Username" error={errors.username}>
            <Input
              value={form.username}
              onChange={(e) => update('username', slugify(e.target.value))}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>

          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>

          <Field label="Password" error={errors.password}>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>

          <Field label="Confirm password" error={errors.confirmPassword}>
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>
        </div>
      )}

      {/* Step 2 — Role application */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-lg font-semibold text-[#FAFAFA]">Role application</h1>

          <div className="grid grid-cols-2 gap-3">
            {ROLE_OPTIONS.map((option) => {
              const selected = form.role === option.role;
              return (
                <button
                  key={option.role}
                  type="button"
                  onClick={() => update('role', option.role)}
                  className={`flex flex-col gap-2 rounded-card border p-4 text-left transition-colors ${
                    selected
                      ? 'border-[#8943F9] bg-[#8943F9]/10'
                      : 'border-white/[0.07] bg-[#09090B] hover:border-white/[0.15]'
                  }`}
                >
                  <span className="text-[#8943F9]">{option.icon}</span>
                  <span className="text-sm font-semibold text-[#FAFAFA]">{option.label}</span>
                  <span className="text-xs text-[rgba(250,250,250,0.55)]">{option.description}</span>
                </button>
              );
            })}
          </div>
          {errors.role && <p className="text-xs text-red-400">{errors.role}</p>}

          <Field label="Why do you want to join?" error={errors.reason}>
            <Textarea
              value={form.reason}
              onChange={(e) => update('reason', e.target.value)}
              rows={4}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>

          <Field label="Relevant experience (optional)">
            <Textarea
              value={form.experience}
              onChange={(e) => update('experience', e.target.value)}
              rows={3}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>
        </div>
      )}

      {/* Step 3 — Socials */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-lg font-semibold text-[#FAFAFA]">Socials (optional)</h1>

          <Field label="Twitter / X handle">
            <Input
              value={form.twitter}
              onChange={(e) => update('twitter', e.target.value)}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>

          <Field label="YouTube channel">
            <Input
              value={form.youtube}
              onChange={(e) => update('youtube', e.target.value)}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>

          <Field label="Discord username">
            <Input
              value={form.discord}
              onChange={(e) => update('discord', e.target.value)}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between gap-3">
        {step > (isDiscordPrefill ? 2 : 1) ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="border-white/[0.15] bg-transparent text-[#FAFAFA] hover:bg-white/[0.05]"
          >
            Back
          </Button>
        ) : (
          <span />
        )}

        {step < 3 && (
          <Button
            type="button"
            onClick={handleNext}
            className="bg-[#8943F9] text-white hover:bg-[#7C3AED]"
          >
            Next
          </Button>
        )}

        {step === 3 && (
          <Button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="flex items-center gap-2 bg-[#8943F9] text-white hover:bg-[#7C3AED] disabled:opacity-60"
          >
            {submitting && <LoadingSpinner size={16} />}
            Submit application
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default function ApplyPage(): ReactElement {
  return (
    <Suspense fallback={null}>
      <ApplyForm />
    </Suspense>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactElement;
}): ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[rgba(250,250,250,0.55)]">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
