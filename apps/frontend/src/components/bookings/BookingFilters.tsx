'use client';

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookingStatus } from '@/types';
import type { BookingStatus as BookingStatusType } from '@/types';

import { fromZonedTime } from 'date-fns-tz';

interface BookingFiltersProps {
  onFilterChange: (filters: {
    tab: FilterTab;
    status?: BookingStatusType;
    statusGroup?: 'failed';
    fromDate?: string;
    toDate?: string;
  }) => void;
}

export type FilterTab = 'all' | 'pending' | 'cancelled' | 'completed';

const BUSINESS_TIMEZONE = process.env.NEXT_PUBLIC_BUSINESS_TIMEZONE || 'Asia/Ho_Chi_Minh';

export function BookingFilters({ onFilterChange }: BookingFiltersProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const toStartOfDayIso = (date: string) =>
    fromZonedTime(`${date} 00:00:00`, BUSINESS_TIMEZONE).toISOString();
  const toEndOfDayIso = (date: string) =>
    fromZonedTime(`${date} 23:59:59.999`, BUSINESS_TIMEZONE).toISOString();

  useEffect(() => {
    const filters: {
      tab: FilterTab;
      status?: BookingStatusType;
      statusGroup?: 'failed';
      fromDate?: string;
      toDate?: string;
    } = { tab: activeTab };

    if (activeTab === 'pending') {
      filters.status = BookingStatus.PENDING_PAYMENT;
    } else if (activeTab === 'cancelled') {
      filters.statusGroup = 'failed';
    } else if (activeTab === 'completed') {
      filters.status = BookingStatus.COMPLETED;
    }

    if (fromDate) {
      filters.fromDate = toStartOfDayIso(fromDate);
    }
    if (toDate) {
      filters.toDate = toEndOfDayIso(toDate);
    }

    onFilterChange(filters);
  }, [activeTab, fromDate, toDate, onFilterChange]);

  const handleTabClick = (tab: FilterTab) => {
    setActiveTab(tab);
  };

  return (
    <>
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
          Active
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
          Pending Payment
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
          Completed
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
          Cancelled
        </button>
      </div>

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
            title="Tu ngay"
          />
          <span className="text-slate-300">|</span>
          <input
            id="toDate"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full border-none p-0 text-sm focus:ring-0"
            title="Den ngay"
          />
        </div>
      </div>
    </>
  );
}
