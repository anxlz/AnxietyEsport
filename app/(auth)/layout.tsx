import type { ReactElement, ReactNode } from 'react';

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#09090B] px-4">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, rgba(137,67,249,0.07), transparent 60%)',
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
