'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Film } from 'lucide-react';

interface GalleryModalProps {
  images: string[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'm4v', '3gp', 'mkv', 'avi'];

function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('/video/upload/')) return true;
  const ext = lowerUrl.split('.').pop()?.split('?')[0] ?? '';
  return VIDEO_EXTENSIONS.includes(ext);
}

export function PropertyGalleryModal({ images, isOpen, onClose, initialIndex = 0 }: GalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevInitialIndex, setPrevInitialIndex] = useState(initialIndex);

  if (isOpen !== prevIsOpen || initialIndex !== prevInitialIndex) {
    setPrevIsOpen(isOpen);
    setPrevInitialIndex(initialIndex);
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || images.length === 0) return null;

  const currentMedia = images[currentIndex];
  const isVideo = isVideoUrl(currentMedia);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between text-white max-w-7xl mx-auto w-full">
        <span className="text-sm font-semibold tracking-wide flex items-center gap-2">
          {isVideo && (
            <span className="bg-accent/20 text-accent border border-accent/40 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
              <Film className="w-3 h-3" /> Video
            </span>
          )}
          <span>
            {currentIndex + 1} / {images.length}
          </span>
        </span>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/25 transition-colors text-white"
          aria-label="Close gallery"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Display Area */}
      <div className="relative flex-1 flex items-center justify-center max-w-6xl mx-auto w-full my-4">
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:-left-12 z-10 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
            aria-label="Previous media"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <div className="relative w-full h-[70vh] rounded-2xl overflow-hidden flex items-center justify-center">
          {isVideo ? (
            <video
              src={currentMedia}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-full rounded-2xl object-contain"
            />
          ) : (
            <Image
              src={currentMedia}
              alt={`Property view ${currentIndex + 1}`}
              fill
              className="object-contain"
              priority
              sizes="100vw"
            />
          )}
        </div>

        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 sm:-right-12 z-10 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
            aria-label="Next media"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      <div className="max-w-4xl mx-auto w-full flex gap-2 overflow-x-auto scrollbar-none py-2">
        {images.map((mediaUrl, idx) => {
          const itemIsVideo = isVideoUrl(mediaUrl);
          return (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                currentIndex === idx
                  ? 'border-accent scale-105'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {itemIsVideo ? (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <Film className="w-4 h-4 text-white" />
                </div>
              ) : (
                <Image
                  src={mediaUrl}
                  alt={`Thumbnail ${idx + 1}`}
                  sizes="64px"
                  fill
                  className="object-cover"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
