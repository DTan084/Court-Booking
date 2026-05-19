import Link from 'next/link';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 p-12 text-center',
        className,
      )}
    >
      {/* Icon */}
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>

      {/* Description */}
      {description && <p className="mb-6 max-w-md text-sm text-muted-foreground">{description}</p>}

      {/* Action Button */}
      {action && (
        <Button asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
