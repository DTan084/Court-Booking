'use client';

import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCourt } from '@/hooks/useCourt';
import { useTimeSlots } from '@/hooks/useTimeSlots';
import { TimeSlotEditor } from '@/components/admin/TimeSlotEditor';
import { SkeletonCard } from '@/components/shared/SkeletonCard';

// ==================== COMPONENT ====================

export default function TimeSlotManagerPage({ params }: { params: { id: string } }) {
  const { data: court, isLoading: courtLoading } = useCourt(params.id);
  const { data: timeSlots, isLoading: slotsLoading } = useTimeSlots(params.id);

  const isLoading = courtLoading || slotsLoading;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          asChild
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/admin/courts">
            <ArrowLeft className="h-4 w-4" />
            Quay lại quản lý sân
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Clock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý khung giờ</h1>
          {court && (
            <p className="text-sm text-muted-foreground">
              {court.name} —{' '}
              {court.sportType === 'badminton'
                ? 'Cầu lông'
                : court.sportType === 'tennis'
                  ? 'Tennis'
                  : court.sportType === 'football'
                    ? 'Bóng đá'
                    : court.sportType === 'basketball'
                      ? 'Bóng rổ'
                      : 'Bóng chuyền'}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <SkeletonCard count={4} />
      ) : court && timeSlots ? (
        <TimeSlotEditor courtId={params.id} timeSlots={timeSlots} />
      ) : (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">Không tìm thấy sân.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/admin/courts">Quay lại</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
