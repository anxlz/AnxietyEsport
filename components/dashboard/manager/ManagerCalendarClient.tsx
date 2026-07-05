'use client';

import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction';
import type { EventClickArg } from '@fullcalendar/core';
import { motion } from 'framer-motion';
import type { Match } from '@/lib/types/database';

interface ManagerCalendarClientProps {
  matches: Match[];
}

export function ManagerCalendarClient({ matches }: ManagerCalendarClientProps): ReactElement {
  const router = useRouter();

  const events = matches.map((match) => ({
    id: match.id,
    title: `vs ${match.opponentName}`,
    start: match.matchDate ?? undefined,
    backgroundColor:
      match.status === 'completed'
        ? match.teamScore > match.oppScore
          ? '#22c55e'
          : '#ef4444'
        : '#8943F9',
    borderColor: 'transparent',
    extendedProps: { match },
  }));

  function handleEventClick(arg: EventClickArg): void {
    router.push(`/dashboard/manager/matches/${arg.event.id}`);
  }

  function handleDateClick(arg: DateClickArg): void {
    router.push(`/dashboard/manager/matches/new?date=${arg.dateStr}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-card border border-white/[0.07] bg-surface-card p-4"
    >
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
        events={events}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        height="auto"
      />
    </motion.div>
  );
}
