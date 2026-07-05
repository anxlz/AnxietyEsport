import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex w-full rounded-input border border-white/[0.1] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[rgba(250,250,250,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8943F9] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
