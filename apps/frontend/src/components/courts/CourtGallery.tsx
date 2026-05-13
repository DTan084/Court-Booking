'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
      <div className="grid h-[440px] grid-cols-1 gap-2 overflow-hidden rounded-2xl md:grid-cols-3">
        <button type="button" className="relative md:col-span-2" onClick={() => setOpen(true)}>
          <Image
            src={galleryImages[0]?.url}
            alt={galleryImages[0]?.altText ?? courtName}
            fill
            sizes="(max-width: 768px) 100vw, 66vw"
            className="object-cover"
          />
        </button>
        <div className="hidden grid-rows-2 gap-2 md:grid">
          {[galleryImages[1], galleryImages[2]].map((img, idx) => (
            <button
              key={img?.id ?? `empty-${idx}`}
              type="button"
              className="overflow-hidden"
              onClick={() => {
                if (!img) return;
                setActiveIndex(idx + 1);
                setOpen(true);
              }}
            >
              {img ? (
                <Image
                  src={img.url}
                  alt={img.altText ?? courtName}
                  width={480}
                  height={280}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-slate-100" />
              )}
            </button>
          ))}
        </div>
      </div>
      {galleryImages.length > 3 && (
        <button
          type="button"
          className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          onClick={() => setOpen(true)}
        >
          Xem tat ca {galleryImages.length} anh
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogTitle>{courtName}</DialogTitle>
          <div className="relative">
            <Image
              src={active.url}
              alt={active.altText ?? courtName}
              width={1400}
              height={900}
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
                  src={img.url}
                  alt={img.altText ?? courtName}
                  width={160}
                  height={96}
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
