'use client';

import { useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
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

export default function ApplyPage(): ReactElement {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'fullName' && !prev.username) {
        next.username = slugify(value as string);
      }
      return next;
    });
  }

  function validateStep1(): FormErrors {
    const stepErrors: FormErrors = {};
    if (!form.fullName.trim()) stepErrors.fullName = 'Full name is required.';
    if (!form.username.trim()) stepErrors.username = 'Username is required.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) stepErrors.email = 'Enter a valid email.';
    if (form.password.length < 8) stepErrors.password = 'Password must be at least 8 characters.';
    if (form.confirmPassword !== form.password) {
      stepErrors.confirmPassword = 'Passwords do not match.';
    }
    return stepErrors;
  }

  function validateStep2(): FormErrors {
    const stepErrors: FormErrors = {};
    if (!form.role) stepErrors.role = 'Select a role to apply for.';
    if (form.reason.trim().length < 50) {
      stepErrors.reason = 'Please write at least 50 characters.';
    }
    return stepErrors;
  }

  function handleNext(): void {
    const stepErrors = step === 1 ? validateStep1() : validateStep2();
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) {
      setStep((current) => Math.min(current + 1, 3));
    }
  }

  function handleBack(): void {
    setErrors({});
    setStep((current) => Math.max(current - 1, 1));
  }

  async function handleSubmit(): Promise<void> {
    setSubmitError(null);
    setSubmitting(true);

    const supabase = createSupabaseBrowserClient();
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

    // Supabase Auth doesn't return an error for an already-registered email when
    // email confirmations are enabled (this prevents account enumeration). The
    // documented way to detect it: a genuinely new signup has at least one entry
    // in `identities`; signing up again with an existing, already-confirmed email
    // returns a user object with an empty `identities` array instead.
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-lg rounded-card border border-white/[0.07] bg-[#111114] p-8"
    >
      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2, 3].map((dot) => (
          <span
            key={dot}
            className={`h-1.5 w-8 rounded-full transition-colors ${
              dot <= step ? 'bg-[#8943F9]' : 'bg-white/[0.1]'
            }`}
          />
        ))}
      </div>

      {submitError && (
        <div className="mb-4 rounded-input border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {submitError}
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-lg font-semibold text-[#FAFAFA]">Account details</h1>

          <Field label="Full name" error={errors.fullName}>
            <Input
              value={form.fullName}
              onChange={(event) => update('fullName', event.target.value)}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>

          <Field label="Username" error={errors.username}>
            <Input
              value={form.username}
              onChange={(event) => update('username', slugify(event.target.value))}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>

          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>

          <Field label="Password" error={errors.password}>
            <Input
              type="password"
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>

          <Field label="Confirm password" error={errors.confirmPassword}>
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={(event) => update('confirmPassword', event.target.value)}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>
        </div>
      )}

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
                  <span className="text-xs text-[rgba(250,250,250,0.55)]">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.role && <p className="text-xs text-red-400">{errors.role}</p>}

          <Field label="Why do you want to join?" error={errors.reason}>
            <Textarea
              value={form.reason}
              onChange={(event) => update('reason', event.target.value)}
              rows={4}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>

          <Field label="Relevant experience (optional)">
            <Textarea
              value={form.experience}
              onChange={(event) => update('experience', event.target.value)}
              rows={3}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-lg font-semibold text-[#FAFAFA]">Socials (optional)</h1>

          <Field label="Twitter / X handle">
            <Input
              value={form.twitter}
              onChange={(event) => update('twitter', event.target.value)}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>

          <Field label="YouTube channel">
            <Input
              value={form.youtube}
              onChange={(event) => update('youtube', event.target.value)}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>

          <Field label="Discord username">
            <Input
              value={form.discord}
              onChange={(event) => update('discord', event.target.value)}
              className="rounded-input border-white/[0.1] bg-[#09090B] text-[#FAFAFA]"
            />
          </Field>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 1 ? (
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
