'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { LayoutGrid } from 'lucide-react';
import { PropertyGalleryModal } from './property-gallery-modal';

interface GalleryWrapperProps {
  gallery: string[];
  title: string;
}

export function PropertyGalleryWrapper({ gallery, title }: GalleryWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleOpen = (index: number) => {
    setSelectedIndex(index);
    setIsOpen(true);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 h-[320px] sm:h-[450px] rounded-3xl overflow-hidden border border-border cursor-pointer">

          {/* Main Large Image */}
          <div
            onClick={() => handleOpen(0)}
            className="relative md:col-span-2 h-full bg-muted group overflow-hidden"
          >
            <Image
              src={gallery[0]}
              alt={title}
              fill
              priority
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* Secondary Grid Images */}
          <div className="hidden md:grid col-span-2 grid-cols-2 gap-3 h-full">
            {gallery.slice(1, 4).map((img, idx) => (
              <div
                key={idx}
                onClick={() => handleOpen(idx + 1)}
                className="relative h-full bg-muted group overflow-hidden"
              >
                <Image src={img} alt={`Gallery ${idx + 2}`} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
            ))}

            {/* View All Overlay Button */}
            <div
              onClick={() => handleOpen(0)}
              className="relative h-full bg-muted flex items-center justify-center bg-black/80 text-white font-bold text-xs hover:bg-black/90 transition-colors gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>+ View Gallery</span>
            </div>
          </div>

        </div>
      </div>

      <PropertyGalleryModal
        images={gallery}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialIndex={selectedIndex}
      />
    </>
  );
}
