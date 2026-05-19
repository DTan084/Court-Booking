import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TopCourt } from '@/hooks/useAdminStats';

// ==================== TYPES ====================

interface TopCourtsTableProps {
  courts: TopCourt[];
}

// ==================== COMPONENT ====================

export function TopCourtsTable({ courts }: TopCourtsTableProps) {
  if (courts.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No booking data available for this period.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Court Name</TableHead>
            <TableHead className="text-right">Bookings Count</TableHead>
            <TableHead className="text-right">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courts.map((court, index) => (
            <TableRow key={court.courtId}>
              <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="font-medium">{court.courtName}</TableCell>
              <TableCell className="text-right">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
                  {court.bookingCount} bookings
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/courts/${court.courtId}`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  View Details
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
