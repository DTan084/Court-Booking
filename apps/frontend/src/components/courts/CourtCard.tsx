import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { SportType, CourtStatus } from '@/types';
import type { Court } from '@/types';

interface CourtCardProps {
  court: Court;
}

const sportTypeLabels: Record<SportType, string> = {
  [SportType.BADMINTON]: 'Badminton',
  [SportType.TENNIS]: 'Tennis',
  [SportType.FOOTBALL]: 'Football',
  [SportType.BASKETBALL]: 'Basketball',
  [SportType.VOLLEYBALL]: 'Volleyball',
};

const sportAccent: Record<SportType, string> = {
  [SportType.BADMINTON]: 'bg-cyan-600',
  [SportType.TENNIS]: 'bg-emerald-600',
  [SportType.FOOTBALL]: 'bg-orange-600',
  [SportType.BASKETBALL]: 'bg-indigo-600',
  [SportType.VOLLEYBALL]: 'bg-pink-600',
};

const sportImage: Record<SportType, string> = {
  [SportType.TENNIS]:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDx4mHP7b49FZfVX9NSatd2ArWaFmBkiNox37LbWiyTMgf5YNuuTO9TftycpR9QG68ixXDCIlVCDQvomxhKc8sZJCEVyvQ-Eesbd_B5kUPvjLtfno6ufX4Cw0ij1lngysbQJCqcddm0k6SZ9LS8kHl-6I7gcQWtskwnbjXEzHgSv5oSW2seLdV1MpuN1cIRB37-ggyk45_bzyUx4YaLmAOU8d6FA7zux9wudy51NbaWBVMoQv39uYmLsliakP4U3GcxcBRoUL5zRg',
  [SportType.BADMINTON]:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDO8UsuSBkKf_J4vteMK1dgZ7QxXnKdN-vbD_b3J2CzoNPLp4F3rWrDVo8Og7_nEHBAH5UQq542-lXA_XIWoTUFbFpJ-Vu4yG1MLA4TiB2XZfuSCXxDKsebykLBsFBD6IWvG9jCkbxw1N5qel9ipjzs8n8RVCoQrrq8bckiTMTirMPuJHxRIyg_1vxDSAqBf32d49M-Px8GhWtpw1M5JiHMscQhdUNjg793kOrKtsDTg6gF3cgIjPJW6u5KTn4z0nCZpzuPmqqWvw',
  [SportType.BASKETBALL]:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAjkfmUnbCbfzASe1q2YHdngPC3QwzO3-naO-dF8ujG5k8twk2gtxImgxio398TsPi9p13lidj3HTG1MSvWcKSjdn1_e3DuCsjGv0_1lcFE43bTZ1P1N4kbsLDiXWzwGSzC4HsMsUNGzGObLF5uLuAfEx7hIp0t6-MWBlGgqFgX3zOjvZO0drQEShzlwgiDC5oL7DV8629mW43ef3NOLEEu-UxAD6br8IcrRtmUUYH7EUxK4rAYMcnRxDrduAMenly0Nmp3cbhVig',
  [SportType.FOOTBALL]:
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
  [SportType.VOLLEYBALL]:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDA6VwQDETQZMqIJwKbLnWNSS4hEhPK4NJc6oBcbCL1E7F_AksgE3VhaBzEv5BlTPpE_5I_EaQFETwpXAFLK43OUxdHC92M-2LozK8PiFzA0fttla1l_uVAkGU_qEN8a4aWWNe_m2Q6Ct7MqfqK2EfOggvoxGE6bHjfZ4cn1ZDcvz6SUfBIouPwfxkD2fmMxtvcwcHmjA5MS8OlRGuYSiBrq9g55z_4_KX83T9EkzsRJuP2n6L_ySOMroF7Ma1VXWJdlZUGTQXAhg',
};

export function CourtCard({ court }: CourtCardProps) {
  const inactive = court.status === CourtStatus.INACTIVE;

  return (
    <Link
      href={`/courts/${court.id}`}
      className={cn(
        'group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
        inactive && 'opacity-70',
      )}
    >
      <div className="relative h-52 overflow-hidden">
        <img
          src={sportImage[court.sportType]}
          alt={court.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <span
          className={cn(
            'absolute left-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white',
            sportAccent[court.sportType],
          )}
        >
          {sportTypeLabels[court.sportType]}
        </span>
        {inactive && (
          <span className="absolute right-4 top-4 rounded-full bg-slate-900/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            Inactive
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-xl font-bold text-[#0b1c30]">{court.name}</h3>
          <div className="flex items-center gap-1 text-amber-500">
            <Star className="h-4 w-4 fill-current" />
            <span className="text-sm font-bold">4.8</span>
          </div>
        </div>

        <div className="mb-4 flex items-start gap-2 text-sm text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="line-clamp-2">{court.address}</p>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Starting From
            </p>
            <p className="text-xl font-black text-[#0b1c30]">
              {formatCurrency(court.pricePerHour)}
              <span className="ml-1 text-sm font-medium text-slate-500">/hour</span>
            </p>
          </div>
          <span className="inline-flex w-full items-center justify-center rounded-lg bg-[#131b2e] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white">
            View Schedule
          </span>
        </div>
      </div>
    </Link>
  );
}
