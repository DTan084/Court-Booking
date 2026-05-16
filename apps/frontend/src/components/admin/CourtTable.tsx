'use client';

import Link from 'next/link';
import { Pencil, Trash2, Clock, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import { useSportTypes } from '@/hooks/useSportTypes';
import type { Court, CourtStatus } from '@/types';

const sportTypeColors = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
];

const statusConfig: Record<CourtStatus, { label: string; variant: 'success' | 'muted' }> = {
  ACTIVE: { label: 'Hoat dong', variant: 'success' },
  INACTIVE: { label: 'Tam ngung', variant: 'muted' },
};

interface CourtTableProps {
  courts: Court[];
  onEdit: (court: Court) => void;
  onDelete: (court: Court) => void;
}

export function CourtTable({ courts, onEdit, onDelete }: CourtTableProps) {
  const { data: sportTypes = [] } = useSportTypes();
  const sportTypeMap = new Map(
    sportTypes.map((sport, index) => [
      sport.id,
      { name: sport.name, color: sportTypeColors[index % sportTypeColors.length] },
    ]),
  );

  if (courts.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">Chua co san nao. Hay tao san dau tien!</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ten san</TableHead>
            <TableHead>Loai the thao</TableHead>
            <TableHead className="hidden md:table-cell">Dia chi</TableHead>
            <TableHead className="hidden sm:table-cell">Gia/gio</TableHead>
            <TableHead>Trang thai</TableHead>
            <TableHead className="text-right">Hanh dong</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courts.map((court) => {
            const status = statusConfig[court.status];
            const sport = sportTypeMap.get(court.sportTypeId);
            return (
              <TableRow key={court.id}>
                <TableCell className="font-medium">{court.name}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                      sport?.color ?? 'bg-slate-100 text-slate-700',
                    )}
                  >
                    {sport?.name ?? 'Unknown'}
                  </span>
                </TableCell>
                <TableCell className="hidden max-w-[200px] truncate text-sm text-muted-foreground md:table-cell">
                  {court.address}
                </TableCell>
                <TableCell className="hidden text-sm sm:table-cell">
                  {formatCurrency(court.pricePerHour)}/gio
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(court)} title="Sua">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="Quan ly khung gio">
                      <Link href={`/admin/courts/${court.id}/time-slots`}>
                        <Clock className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="Quan ly hinh anh">
                      <Link href={`/admin/courts/${court.id}/edit`}>
                        <ImageIcon className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(court)}
                      title="Xoa"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
