'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryModalProps {
  images: string[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
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
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
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

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8 animate-in fade-in duration-200">

      {/* Top Bar */}
      <div className="flex items-center justify-between text-white max-w-7xl mx-auto w-full">
        <span className="text-sm font-semibold tracking-wide">
          {currentIndex + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/25 transition-colors text-white"
          aria-label="Close gallery"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Slide Image */}
      <div className="relative flex-1 flex items-center justify-center max-w-6xl mx-auto w-full my-4">
        <button
          onClick={handlePrev}
          className="absolute left-2 sm:-left-12 z-10 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="relative w-full h-[70vh] rounded-2xl overflow-hidden">
          <Image
            src={images[currentIndex]}
            alt={`Property view ${currentIndex + 1}`}
            fill
            className="object-contain"
            priority
          />
        </div>

        <button
          onClick={handleNext}
          className="absolute right-2 sm:-right-12 z-10 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
          aria-label="Next image"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Thumbnail Strip */}
      <div className="max-w-4xl mx-auto w-full flex gap-2 overflow-x-auto no-scrollbar py-2">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
              currentIndex === idx ? 'border-accent scale-105' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Image src={img} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" />
          </button>
        ))}
      </div>

    </div>
  );
}
