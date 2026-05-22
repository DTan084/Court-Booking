'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCourt } from '@/hooks/useCourt';
import { useTimeSlots } from '@/hooks/useTimeSlots';
import { TimeSlotEditor } from '@/components/admin/TimeSlotEditor';
import { SkeletonCard } from '@/components/shared/SkeletonCard';

export default function TimeSlotManagerPage() {
  const params = useParams<{ id: string }>();
  const courtId = params.id;
  const { data: court, isLoading: courtLoading } = useCourt(courtId);
  const { data: timeSlots, isLoading: slotsLoading } = useTimeSlots(courtId);

  const isLoading = courtLoading || slotsLoading;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          asChild
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/admin/courts">
            <ArrowLeft className="h-4 w-4" />
            Back to Court Management
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Clock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Timeslots</h1>
          {court && <p className="text-sm text-muted-foreground">{court.name}</p>}
        </div>
      </div>

      {isLoading ? (
        <SkeletonCard count={4} />
      ) : court && timeSlots ? (
        <TimeSlotEditor courtId={courtId} timeSlots={timeSlots} />
      ) : (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">Court not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/admin/courts">Go Back</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
