import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import type { ApplicationStatus, UserRole } from '@/lib/types/database';

interface ApplicationSummary {
  status: ApplicationStatus;
  role: UserRole | null;
  created_at: string;
  admin_note: string | null;
}

function HourglassIcon(): ReactElement {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M6 3h12M6 21h12M7 3c0 4 5 5 5 9s-5 5-5 9M17 3c0 4-5 5-5 9s5 5 5 9"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon(): ReactElement {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="9" strokeWidth="1.6" />
      <path d="M8 12.5l2.5 2.5L16 9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XCircleIcon(): ReactElement {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="9" strokeWidth="1.6" />
      <path d="M9 9l6 6M15 9l-6 6" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default async function ApplyStatusPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect('/login');
  }

  const { data: application } = await supabase
    .from('applications')
    .select('status, role, created_at, admin_note')
    .eq('user_id', userData.user.id)
    .single<ApplicationSummary>();

  if (!application) {
    redirect('/apply');
  }

  const submittedDate = new Date(application.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="w-full max-w-md rounded-card border border-white/[0.07] bg-[#111114] p-8 text-center">
      {application.status === 'pending' && (
        <>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#8943F9]/10 text-[#8943F9]">
            <HourglassIcon />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-[#FAFAFA]">Application under review</h1>
          <p className="mt-2 text-sm text-[rgba(250,250,250,0.55)]">
            We&apos;ll notify you by email once a decision has been made.
          </p>
          <div className="mt-4 rounded-input border border-white/[0.07] bg-[#09090B] px-4 py-3 text-sm text-[rgba(250,250,250,0.55)]">
            Applied for <span className="text-[#FAFAFA]">{application.role}</span> on{' '}
            <span className="text-[#FAFAFA]">{submittedDate}</span>
          </div>
        </>
      )}

      {application.status === 'approved' && (
        <>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-400">
            <CheckIcon />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-[#FAFAFA]">You&apos;re in!</h1>
          <p className="mt-2 text-sm text-[rgba(250,250,250,0.55)]">
            Your account is now active.
          </p>
          <Link href="/dashboard">
            <Button className="mt-6 w-full bg-[#8943F9] text-white hover:bg-[#7C3AED]">
              Go to dashboard →
            </Button>
          </Link>
        </>
      )}

      {application.status === 'rejected' && (
        <>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <XCircleIcon />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-[#FAFAFA]">
            Your application wasn&apos;t approved this time
          </h1>
          {application.admin_note && (
            <p className="mt-2 rounded-input border border-white/[0.07] bg-[#09090B] px-4 py-3 text-sm text-[rgba(250,250,250,0.55)]">
              {application.admin_note}
            </p>
          )}
          <Link href="/apply" className="mt-4 inline-block text-sm text-[#8943F9] hover:text-[#7C3AED]">
            Apply again
          </Link>
        </>
      )}

      <form action={signOut} className="mt-8">
        <button type="submit" className="text-xs text-[rgba(250,250,250,0.3)] hover:text-[rgba(250,250,250,0.55)]">
          Log out
        </button>
      </form>
    </div>
  );
}
