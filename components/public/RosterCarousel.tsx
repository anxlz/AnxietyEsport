'use client';

import type { ReactElement } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import type { Roster, RosterMember } from '@/lib/types/database';
import { RosterCard, RosterCardSkeleton } from '@/components/public/RosterCard';

interface RosterCarouselProps {
  rosterGroups: { roster: Roster; members: RosterMember[] }[];
}

export function RosterCarousel({ rosterGroups }: RosterCarouselProps): ReactElement {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-[#FAFAFA] md:text-3xl">Our Rosters</h2>

        <div className="mt-8">
          {rosterGroups.length === 0 ? (
            <div className="flex gap-4 overflow-hidden">
              <RosterCardSkeleton />
              <RosterCardSkeleton />
              <RosterCardSkeleton />
            </div>
          ) : (
            <Swiper
              modules={[FreeMode]}
              freeMode
              slidesPerView="auto"
              spaceBetween={16}
              className="!overflow-visible"
            >
              {rosterGroups.map(({ roster, members }) => (
                <SwiperSlide key={roster.id} className="!w-auto">
                  <RosterCard roster={roster} members={members} />
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </div>
      </div>
    </section>
  );
}
