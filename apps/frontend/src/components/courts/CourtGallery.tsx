'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { normalizeImageUrl, shouldBypassImageOptimizer } from '@/lib/image';
import type { CourtImage } from '@/types';

interface CourtGalleryProps {
  images: CourtImage[];
  courtName: string;
}

const placeholderImage =
  'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=80';

export function CourtGallery({ images, courtName }: CourtGalleryProps) {
  const sortedImages = useMemo(
    () => [...images].sort((a, b) => a.displayOrder - b.displayOrder),
    [images],
  );
  const galleryImages =
    sortedImages.length > 0
      ? sortedImages
      : [{ id: 'placeholder', url: placeholderImage, altText: courtName, displayOrder: 0 }];
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = galleryImages[activeIndex] ?? galleryImages[0];
  const imageCount = galleryImages.length;
  const extraCount = Math.max(0, imageCount - 3);

  const goPrev = useCallback(() => {
    setActiveIndex((idx) => (idx - 1 + galleryImages.length) % Math.max(galleryImages.length, 1));
  }, [galleryImages.length]);
  const goNext = useCallback(() => {
    setActiveIndex((idx) => (idx + 1) % Math.max(galleryImages.length, 1));
  }, [galleryImages.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, goNext, goPrev]);

  return (
    <>
      {imageCount === 1 && (
        <button
          type="button"
          className="relative block h-[420px] w-full overflow-hidden rounded-2xl"
          onClick={() => setOpen(true)}
        >
          <Image
            src={normalizeImageUrl(galleryImages[0].url)}
            alt={galleryImages[0].altText ?? courtName}
            fill
            sizes="100vw"
            unoptimized={shouldBypassImageOptimizer(galleryImages[0].url)}
            className="object-cover transition duration-500 hover:scale-[1.02]"
          />
        </button>
      )}

      {imageCount === 2 && (
        <div className="grid h-[420px] grid-cols-1 gap-2 overflow-hidden rounded-2xl md:grid-cols-2">
          {galleryImages.slice(0, 2).map((img, idx) => (
            <button
              key={img.id}
              type="button"
              className="relative overflow-hidden"
              onClick={() => {
                setActiveIndex(idx);
                setOpen(true);
              }}
            >
              <Image
                src={normalizeImageUrl(img.url)}
                alt={img.altText ?? courtName}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized={shouldBypassImageOptimizer(img.url)}
                className="object-cover transition duration-500 hover:scale-[1.03]"
              />
            </button>
          ))}
        </div>
      )}

      {imageCount >= 3 && (
        <div className="grid h-[440px] grid-cols-1 gap-2 overflow-hidden rounded-2xl md:grid-cols-3">
          <button
            type="button"
            className="relative md:col-span-2"
            onClick={() => {
              setActiveIndex(0);
              setOpen(true);
            }}
          >
            <Image
              src={normalizeImageUrl(galleryImages[0].url)}
              alt={galleryImages[0].altText ?? courtName}
              fill
              sizes="(max-width: 768px) 100vw, 66vw"
              unoptimized={shouldBypassImageOptimizer(galleryImages[0].url)}
              className="object-cover transition duration-500 hover:scale-[1.02]"
            />
          </button>
          <div className="hidden grid-rows-2 gap-2 md:grid">
            {[galleryImages[1], galleryImages[2]].map((img, idx) => (
              <button
                key={img.id}
                type="button"
                className="relative overflow-hidden"
                onClick={() => {
                  setActiveIndex(idx + 1);
                  setOpen(true);
                }}
              >
                <Image
                  src={normalizeImageUrl(img.url)}
                  alt={img.altText ?? courtName}
                  fill
                  sizes="33vw"
                  unoptimized={shouldBypassImageOptimizer(img.url)}
                  className="object-cover transition duration-500 hover:scale-[1.03]"
                />
                {idx === 1 && extraCount > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-white">
                    <span className="text-lg font-bold">+{extraCount}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogTitle>{courtName}</DialogTitle>
          <div className="relative">
            <Image
              src={normalizeImageUrl(active.url)}
              alt={active.altText ?? courtName}
              width={1400}
              height={900}
              unoptimized={shouldBypassImageOptimizer(active.url)}
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
            {galleryImages.length > 1 && (
              <>
                <button
                  aria-label="Anh truoc"
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white"
                  onClick={goPrev}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  aria-label="Anh sau"
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white"
                  onClick={goNext}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {galleryImages.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                className={`h-16 w-24 overflow-hidden rounded border ${idx === activeIndex ? 'border-[#944a00]' : 'border-slate-200'}`}
                onClick={() => setActiveIndex(idx)}
              >
                <Image
                  src={normalizeImageUrl(img.url)}
                  alt={img.altText ?? courtName}
                  width={160}
                  height={96}
                  unoptimized={shouldBypassImageOptimizer(img.url)}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
