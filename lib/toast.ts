import { toast as sonnerToast } from 'sonner';

export const toast = {
  error(message: string): void {
    sonnerToast.error(message, {
      style: { background: '#1A0F14', border: '1px solid rgba(248,113,113,0.3)', color: '#FCA5A5' },
    });
  },
  success(message: string): void {
    sonnerToast.success(message, {
      style: { background: '#0F1A12', border: '1px solid rgba(74,222,128,0.3)', color: '#86EFAC' },
    });
  },
  info(message: string): void {
    sonnerToast(message, {
      style: { background: '#13131A', border: '1px solid rgba(137,67,249,0.3)', color: '#FAFAFA' },
    });
  },
};

/** Extracts a readable message from a Supabase/PostgREST error or unknown error value. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  if (typeof error === 'string') return error;
  return fallback;
}
