'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Grid, Play, Film } from 'lucide-react';
import { PropertyGalleryModal } from '@/components/property-gallery-modal';

interface PropertyGalleryWrapperProps {
  gallery: string[];
  title: string;
}

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'm4v', '3gp', 'mkv', 'avi'];

function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('/video/upload/')) return true;
  const ext = lowerUrl.split('.').pop()?.split('?')[0] ?? '';
  return VIDEO_EXTENSIONS.includes(ext);
}

export function PropertyGalleryWrapper({ gallery, title }: PropertyGalleryWrapperProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialIndex, setModalInitialIndex] = useState(0);
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);

  const totalCount = gallery.length;
  const desktopItems = gallery.slice(0, 5);
  const remainingDesktopCount = totalCount > 5 ? totalCount - 5 : 0;

  const openGalleryAt = (index: number) => {
    setModalInitialIndex(index);
    setIsModalOpen(true);
  };

  const handleMobileScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const index = Math.round(scrollLeft / clientWidth);
    if (index >= 0 && index < totalCount) {
      setActiveMobileIndex(index);
    }
  };

  const scrollToMobileSlide = (index: number) => {
    if (!scrollRef.current) return;
    const targetScroll = index * scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    setActiveMobileIndex(index);
  };

  return (
    <>
      <section className="relative max-w-7xl mx-auto sm:px-6 lg:px-8">
        {/* --- 1. MOBILE SLIDER WITH TOUCH / SWIPE & ARROWS --- */}
        <div className="relative md:hidden group overflow-hidden">
          {/* Swipe Container */}
          <div
            ref={scrollRef}
            onScroll={handleMobileScroll}
            className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth touch-pan-x cursor-grab active:cursor-grabbing"
          >
            {gallery.map((mediaUrl, idx) => {
              const isVideo = isVideoUrl(mediaUrl);
              return (
                <div
                  key={idx}
                  onClick={() => openGalleryAt(idx)}
                  className="relative w-full aspect-[4/3] shrink-0 snap-center bg-muted overflow-hidden"
                >
                  {isVideo ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                      <video
                        src={mediaUrl}
                        playsInline
                        muted
                        preload="metadata"
                        className="w-full h-full object-cover opacity-90"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-black/60 border border-white/40 flex items-center justify-center text-white backdrop-blur-md">
                          <Play className="w-6 h-6 fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={mediaUrl}
                      alt={`${title} - view ${idx + 1}`}
                      fill
                      sizes="100vw"
                      priority={idx === 0}
                      className="object-cover"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Overlay Badge: Counter & Type */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            {isVideoUrl(gallery[activeMobileIndex]) && (
              <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1">
                <Film className="w-3 h-3 text-accent" /> Video
              </span>
            )}
            <span className="bg-black/70 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20 shadow-md">
              {activeMobileIndex + 1} / {totalCount}
            </span>
          </div>

          {/* Mobile Left Arrow */}
          {activeMobileIndex > 0 && (
            <button
              onClick={() => scrollToMobileSlide(activeMobileIndex - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/80 hover:bg-background text-foreground backdrop-blur-md border border-border flex items-center justify-center shadow-lg transition-transform active:scale-95"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Mobile Right Arrow */}
          {activeMobileIndex < totalCount - 1 && (
            <button
              onClick={() => scrollToMobileSlide(activeMobileIndex + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/80 hover:bg-background text-foreground backdrop-blur-md border border-border flex items-center justify-center shadow-lg transition-transform active:scale-95"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Mobile Dots Indicator */}
          {totalCount > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
              {gallery.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => scrollToMobileSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    activeMobileIndex === idx ? 'w-4 bg-accent' : 'w-1.5 bg-white/60'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* --- 2. DESKTOP AIRBNB GRID WITH REMAINING COUNT BADGE --- */}
        <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2.5 h-[440px] rounded-3xl overflow-hidden relative">
          {desktopItems.map((mediaUrl, idx) => {
            const isVideo = isVideoUrl(mediaUrl);
            const isFirst = idx === 0;
            const isLastDesktopItem = idx === 4;

            return (
              <div
                key={idx}
                onClick={() => openGalleryAt(idx)}
                className={`relative group cursor-pointer overflow-hidden bg-muted ${
                  isFirst ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'
                }`}
              >
                {isVideo ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <video
                      src={mediaUrl}
                      playsInline
                      muted
                      preload="metadata"
                      className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-black/60 border border-white/40 flex items-center justify-center text-white backdrop-blur-md group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <Image
                    src={mediaUrl}
                    alt={`${title} - photo ${idx + 1}`}
                    fill
                    sizes={isFirst ? '(max-width: 1200px) 50vw, 600px' : '(max-width: 1200px) 25vw, 300px'}
                    priority={isFirst}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                {/* Hover tint overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

                {/* Remaining Photos Overlay Badge on 5th grid item */}
                {isLastDesktopItem && remainingDesktopCount > 0 && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white transition-opacity group-hover:bg-black/70">
                    <Grid className="w-6 h-6 mb-1 text-accent" />
                    <span className="text-base font-extrabold tracking-wide">
                      +{remainingDesktopCount} more
                    </span>
                    <span className="text-[11px] text-white/80 font-medium">
                      Show all {totalCount} photos & videos
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* --- 3. FULL-SCREEN LIGHTBOX MODAL --- */}
      <PropertyGalleryModal
        images={gallery}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialIndex={modalInitialIndex}
      />
    </>
  );
}
