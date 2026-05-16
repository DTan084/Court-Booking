'use client';

import * as React from 'react';
import { formatCountdown } from '@/lib/booking-utils';
import { cn } from '@/lib/utils';
import { Timer } from 'lucide-react';

interface CountdownTimerProps {
  deadline: string;
  onExpire?: () => void;
  className?: string;
}

/**
 * REQ-18.3: CountdownTimer component
 * Updates every second and displays time in MM:SS format.
 */
export function CountdownTimer({ deadline, onExpire, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = React.useState<string>('--:--');
  const [isExpired, setIsExpired] = React.useState(false);

  React.useEffect(() => {
    const updateTimer = () => {
      const formatted = formatCountdown(deadline);
      setTimeLeft(formatted);

      if (formatted === '00:00') {
        if (!isExpired) {
          setIsExpired(true);
          onExpire?.();
        }
      }
    };

    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [deadline, onExpire, isExpired]);

  return (
    <div
      className={cn(
        'flex items-center gap-2 font-mono text-2xl font-bold transition-colors',
        isExpired ? 'text-destructive' : 'text-amber-600',
        className,
      )}
    >
      <Timer className={cn('h-6 w-6', !isExpired && 'animate-pulse')} />
      <span>{timeLeft}</span>
    </div>
  );
}
