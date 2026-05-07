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

type FilterTab = 'all' | 'confirmed' | 'cancelled';

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
    if (activeTab === 'confirmed') {
      filters.status = BookingStatus.CONFIRMED;
    } else if (activeTab === 'cancelled') {
      filters.status = BookingStatus.CANCELLED;
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
      <div className="flex gap-2 border-b">
        <button
          onClick={() => handleTabClick('all')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'all'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Tất cả
        </button>
        <button
          onClick={() => handleTabClick('confirmed')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'confirmed'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Sắp tới
        </button>
        <button
          onClick={() => handleTabClick('cancelled')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'cancelled'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Đã hủy
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
