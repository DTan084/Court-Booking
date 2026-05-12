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
import type { Court, SportType, CourtStatus } from '@/types';

// ==================== CONSTANTS ====================

const sportTypeLabels: Record<SportType, string> = {
  BADMINTON: 'Cầu lông',
  TENNIS: 'Tennis',
  FOOTBALL: 'Bóng đá',
  BASKETBALL: 'Bóng rổ',
  VOLLEYBALL: 'Bóng chuyền',
};

const sportTypeColors: Record<SportType, string> = {
  BADMINTON: 'bg-blue-100 text-blue-700',
  TENNIS: 'bg-green-100 text-green-700',
  FOOTBALL: 'bg-orange-100 text-orange-700',
  BASKETBALL: 'bg-purple-100 text-purple-700',
  VOLLEYBALL: 'bg-pink-100 text-pink-700',
};

const statusConfig: Record<CourtStatus, { label: string; variant: 'success' | 'muted' }> = {
  ACTIVE: { label: 'Hoạt động', variant: 'success' },
  INACTIVE: { label: 'Tạm ngưng', variant: 'muted' },
};

// ==================== TYPES ====================

interface CourtTableProps {
  courts: Court[];
  onEdit: (court: Court) => void;
  onDelete: (court: Court) => void;
}

// ==================== COMPONENT ====================

export function CourtTable({ courts, onEdit, onDelete }: CourtTableProps) {
  if (courts.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">Chưa có sân nào. Hãy tạo sân đầu tiên!</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên sân</TableHead>
            <TableHead>Loại thể thao</TableHead>
            <TableHead className="hidden md:table-cell">Địa chỉ</TableHead>
            <TableHead className="hidden sm:table-cell">Giá/giờ</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courts.map((court) => {
            const status = statusConfig[court.status];
            return (
              <TableRow key={court.id}>
                <TableCell className="font-medium">{court.name}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                      sportTypeColors[court.sportType],
                    )}
                  >
                    {sportTypeLabels[court.sportType]}
                  </span>
                </TableCell>
                <TableCell className="hidden max-w-[200px] truncate md:table-cell text-muted-foreground text-sm">
                  {court.address}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm">
                  {formatCurrency(court.pricePerHour)}/giờ
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(court)}
                      aria-label={`Sửa sân ${court.name}`}
                      title="Sửa"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      aria-label={`Quản lý khung giờ sân ${court.name}`}
                      title="Quản lý khung giờ"
                    >
                      <Link href={`/admin/courts/${court.id}/time-slots`}>
                        <Clock className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      aria-label={`Quản lý hình ảnh sân ${court.name}`}
                      title="Quản lý hình ảnh"
                    >
                      <Link href={`/admin/courts/${court.id}/edit`}>
                        <ImageIcon className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(court)}
                      aria-label={`Xóa sân ${court.name}`}
                      title="Xóa"
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
