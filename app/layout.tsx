import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactElement, ReactNode } from 'react';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Anxiety Esports',
  description: 'CODM competitive esports team management platform.',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans bg-[#09090B] min-h-screen text-[#FAFAFA]`}
        suppressHydrationWarning
      >
        <div className="bg-[#09090B] min-h-screen text-[#FAFAFA]">{children}</div>
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#111114',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#FAFAFA',
            },
          }}
        />
      </body>
    </html>
  );
}
