import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== TYPES ====================

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  highlight?: boolean; // e.g. utilization > 80%
  hint?: string;
}

// ==================== COMPONENT ====================

export function MetricCard({ title, value, icon, trend, highlight, hint }: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-6 shadow-sm',
        highlight && 'border-green-300 bg-green-50',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p
            className={cn(
              'text-sm font-medium',
              highlight ? 'text-green-700' : 'text-muted-foreground',
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              'mt-2 text-3xl font-bold',
              highlight ? 'text-green-800' : 'text-foreground',
            )}
          >
            {value}
          </p>
          {trend && (
            <div
              className={cn(
                'mt-2 flex items-center gap-1 text-sm',
                trend.isPositive ? 'text-green-600' : 'text-red-600',
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
            </div>
          )}
          {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {icon && (
          <div
            className={cn(
              'rounded-lg p-3',
              highlight ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary',
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
