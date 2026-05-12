'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { CourtImage, SportType } from '@/types';

interface CourtGalleryProps {
  images: CourtImage[];
  courtName: string;
  sportType: SportType;
}

const sportImage: Record<SportType, string> = {
  TENNIS:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDx4mHP7b49FZfVX9NSatd2ArWaFmBkiNox37LbWiyTMgf5YNuuTO9TftycpR9QG68ixXDCIlVCDQvomxhKc8sZJCEVyvQ-Eesbd_B5kUPvjLtfno6ufX4Cw0ij1lngysbQJCqcddm0k6SZ9LS8kHl-6I7gcQWtskwnbjXEzHgSv5oSW2seLdV1MpuN1cIRB37-ggyk45_bzyUx4YaLmAOU8d6FA7zux9wudy51NbaWBVMoQv39uYmLsliakP4U3GcxcBRoUL5zRg',
  BADMINTON:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDO8UsuSBkKf_J4vteMK1dgZ7QxXnKdN-vbD_b3J2CzoNPLp4F3rWrDVo8Og7_nEHBAH5UQq542-lXA_XIWoTUFbFpJ-Vu4yG1MLA4TiB2XZfuSCXxDKsebykLBsFBD6IWvG9jCkbxw1N5qel9ipjzs8n8RVCoQrrq8bckiTMTirMPuJHxRIyg_1vxDSAqBf32d49M-Px8GhWtpw1M5JiHMscQhdUNjg793kOrKtsDTg6gF3cgIjPJW6u5KTn4z0nCZpzuPmqqWvw',
  BASKETBALL:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAjkfmUnbCbfzASe1q2YHdngPC3QwzO3-naO-dF8ujG5k8twk2gtxImgxio398TsPi9p13lidj3HTG1MSvWcKSjdn1_e3DuCsjGv0_1lcFE43bTZ1P1N4kbsLDiXWzwGSzC4HsMsUNGzGObLF5uLuAfEx7hIp0t6-MWBlGgqFgX3zOjvZO0drQEShzlwgiDC5oL7DV8629mW43ef3NOLEEu-UxAD6br8IcrRtmUUYH7EUxK4rAYMcnRxDrduAMenly0Nmp3cbhVig',
  FOOTBALL:
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
  VOLLEYBALL:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDA6VwQDETQZMqIJwKbLnWNSS4hEhPK4NJc6oBcbCL1E7F_AksgE3VhaBzEv5BlTPpE_5I_EaQFETwpXAFLK43OUxdHC92M-2LozK8PiFzA0fttla1l_uVAkGU_qEN8a4aWWNe_m2Q6Ct7MqfqK2EfOggvoxGE6bHjfZ4cn1ZDcvz6SUfBIouPwfxkD2fmMxtvcwcHmjA5MS8OlRGuYSiBrq9g55z_4_KX83T9EkzsRJuP2n6L_ySOMroF7Ma1VXWJdlZUGTQXAhg',
};

export function CourtGallery({ images, courtName, sportType }: CourtGalleryProps) {
  const sortedImages = useMemo(
    () => [...images].sort((a, b) => a.displayOrder - b.displayOrder),
    [images],
  );
  const galleryImages =
    sortedImages.length > 0
      ? sortedImages
      : [{ id: 'placeholder', url: sportImage[sportType], altText: courtName, displayOrder: 0 }];
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = galleryImages[activeIndex] ?? galleryImages[0];

  const goPrev = useCallback(
    () =>
      setActiveIndex((idx) => (idx - 1 + galleryImages.length) % Math.max(galleryImages.length, 1)),
    [galleryImages.length],
  );
  const goNext = useCallback(
    () => setActiveIndex((idx) => (idx + 1) % Math.max(galleryImages.length, 1)),
    [galleryImages.length],
  );

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
          <img
            src={galleryImages[0]?.url}
            alt={galleryImages[0]?.altText ?? courtName}
            className="h-full w-full object-cover"
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
                <img
                  src={img.url}
                  alt={img.altText ?? courtName}
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
          Xem tất cả {galleryImages.length} ảnh
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogTitle>{courtName}</DialogTitle>
          <div className="relative">
            <img
              src={active.url}
              alt={active.altText ?? courtName}
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
            {galleryImages.length > 1 && (
              <>
                <button
                  aria-label="Ảnh trước"
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white"
                  onClick={goPrev}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  aria-label="Ảnh sau"
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
                <img
                  src={img.url}
                  alt={img.altText ?? courtName}
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
