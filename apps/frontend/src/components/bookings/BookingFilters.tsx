'use client';

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookingStatus } from '@/types';
import type { BookingStatus as BookingStatusType } from '@/types';

// ==================== TYPES ====================

interface BookingFiltersProps {
  onFilterChange: (filters: {
    status?: BookingStatusType;
    fromDate?: string;
    toDate?: string;
  }) => void;
}

type FilterTab = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'completed';

// ==================== COMPONENT ====================

export function BookingFilters({ onFilterChange }: BookingFiltersProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Update filters when tab or dates change
  useEffect(() => {
    const filters: {
      status?: BookingStatusType;
      fromDate?: string;
      toDate?: string;
    } = {};

    // Map tab to status
    if (activeTab === 'pending') {
      filters.status = BookingStatus.PENDING_PAYMENT;
    } else if (activeTab === 'confirmed') {
      filters.status = BookingStatus.CONFIRMED;
    } else if (activeTab === 'cancelled') {
      filters.status = BookingStatus.CANCELLED;
    } else if (activeTab === 'expired') {
      filters.status = BookingStatus.EXPIRED;
    } else if (activeTab === 'completed') {
      filters.status = BookingStatus.COMPLETED;
    }

    // Add date filters if provided
    if (fromDate) {
      filters.fromDate = fromDate;
    }
    if (toDate) {
      filters.toDate = toDate;
    }

    onFilterChange(filters);
  }, [activeTab, fromDate, toDate, onFilterChange]);

  const handleTabClick = (tab: FilterTab) => {
    setActiveTab(tab);
  };

  return (
    <div className="space-y-4">
      {/* Status Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto no-scrollbar">
        <button
          onClick={() => handleTabClick('all')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
            activeTab === 'all'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Tất cả
        </button>
        <button
          onClick={() => handleTabClick('pending')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
            activeTab === 'pending'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Chờ thanh toán
        </button>
        <button
          onClick={() => handleTabClick('confirmed')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
            activeTab === 'confirmed'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Đã xác nhận
        </button>
        <button
          onClick={() => handleTabClick('completed')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
            activeTab === 'completed'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Hoàn thành
        </button>
        <button
          onClick={() => handleTabClick('cancelled')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
            activeTab === 'cancelled'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Đã hủy
        </button>
        <button
          onClick={() => handleTabClick('expired')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
            activeTab === 'expired'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Hết hạn
        </button>
      </div>

      {/* Date Range Picker */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Lọc theo ngày:</span>
        </div>
        <div className="flex flex-1 gap-3">
          <div className="flex-1">
            <label htmlFor="fromDate" className="sr-only">
              Từ ngày
            </label>
            <input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Từ ngày"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="toDate" className="sr-only">
              Đến ngày
            </label>
            <input
              id="toDate"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Đến ngày"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
