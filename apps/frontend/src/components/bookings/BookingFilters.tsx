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
    <>
      {/* Status Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-100 px-4 no-scrollbar">
        <button
          onClick={() => handleTabClick('all')}
          className={cn(
            'whitespace-nowrap px-6 py-4 text-[14px] font-semibold tracking-wide transition-colors',
            activeTab === 'all'
              ? 'border-b-2 border-orange-500 text-slate-900'
              : 'border-b-2 border-transparent text-slate-400 hover:text-slate-900',
          )}
        >
          Tất cả (All)
        </button>
        <button
          onClick={() => handleTabClick('pending')}
          className={cn(
            'whitespace-nowrap px-6 py-4 text-[14px] font-semibold tracking-wide transition-colors',
            activeTab === 'pending'
              ? 'border-b-2 border-orange-500 text-slate-900'
              : 'border-b-2 border-transparent text-slate-400 hover:text-slate-900',
          )}
        >
          Chờ thanh toán (Pending)
        </button>
        <button
          onClick={() => handleTabClick('confirmed')}
          className={cn(
            'whitespace-nowrap px-6 py-4 text-[14px] font-semibold tracking-wide transition-colors',
            activeTab === 'confirmed'
              ? 'border-b-2 border-orange-500 text-slate-900'
              : 'border-b-2 border-transparent text-slate-400 hover:text-slate-900',
          )}
        >
          Đã xác nhận (Confirmed)
        </button>
        <button
          onClick={() => handleTabClick('completed')}
          className={cn(
            'whitespace-nowrap px-6 py-4 text-[14px] font-semibold tracking-wide transition-colors',
            activeTab === 'completed'
              ? 'border-b-2 border-orange-500 text-slate-900'
              : 'border-b-2 border-transparent text-slate-400 hover:text-slate-900',
          )}
        >
          Hoàn thành (Completed)
        </button>
        <button
          onClick={() => handleTabClick('cancelled')}
          className={cn(
            'whitespace-nowrap px-6 py-4 text-[14px] font-semibold tracking-wide transition-colors',
            activeTab === 'cancelled'
              ? 'border-b-2 border-orange-500 text-slate-900'
              : 'border-b-2 border-transparent text-slate-400 hover:text-slate-900',
          )}
        >
          Đã hủy (Cancelled)
        </button>
        <button
          onClick={() => handleTabClick('expired')}
          className={cn(
            'whitespace-nowrap px-6 py-4 text-[14px] font-semibold tracking-wide transition-colors',
            activeTab === 'expired'
              ? 'border-b-2 border-orange-500 text-slate-900'
              : 'border-b-2 border-transparent text-slate-400 hover:text-slate-900',
          )}
        >
          Hết hạn (Expired)
        </button>
      </div>

      {/* Date Range Picker */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-50/50 p-4">
        <div className="flex max-w-sm flex-grow items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Date range:
          </span>
          <input
            id="fromDate"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full border-none p-0 text-sm focus:ring-0"
            title="Từ ngày"
          />
          <span className="text-slate-300">|</span>
          <input
            id="toDate"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full border-none p-0 text-sm focus:ring-0"
            title="Đến ngày"
          />
        </div>
      </div>
    </>
  );
}
