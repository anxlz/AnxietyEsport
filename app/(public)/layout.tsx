import type { ReactElement, ReactNode } from 'react';
import { PublicNavbar } from '@/components/public/PublicNavbar';

export default function PublicLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <>
      <PublicNavbar />
      {children}
    </>
  );
}
