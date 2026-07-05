'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function HomeHero(): ReactElement {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090B]">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(137,67,249,0.08), transparent 60%)',
        }}
        aria-hidden="true"
      />

      {/* TODO: replace with <video autoPlay muted loop playsInline src="/hero.mp4" /> once footage is ready */}
      <div className="absolute inset-0 bg-[#09090B]" aria-hidden="true" />

      <div className="absolute inset-0 bg-[#09090B]/60" aria-hidden="true" />

      <motion.div
        className="relative z-10 flex flex-col items-center px-4 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.span
          variants={itemVariants}
          className="rounded-full border border-white/[0.1] bg-white/[0.05] px-3 py-1 text-xs text-[#8943F9]"
        >
          CODM · Competitive
        </motion.span>

        <motion.h1
          variants={itemVariants}
          className="mt-6 text-6xl font-black tracking-tight text-[#FAFAFA] md:text-8xl"
        >
          Anxiety Esports
        </motion.h1>

        <motion.p variants={itemVariants} className="mt-4 text-lg text-white/55">
          Built to win. Trained to dominate.
        </motion.p>

        <motion.div variants={itemVariants} className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/rosters">
            <Button className="bg-[#8943F9] hover:bg-[#7C3AED] text-white px-6 py-2.5">
              Meet the Roster
            </Button>
          </Link>
          <Link href="/results">
            <Button
              variant="outline"
              className="border-white/[0.15] bg-transparent text-[#FAFAFA] hover:bg-white/[0.05] px-6 py-2.5"
            >
              View Results
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
