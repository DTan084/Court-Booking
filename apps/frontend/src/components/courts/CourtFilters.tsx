'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useDistricts } from '@/hooks/useCourts';
import type { SportType } from '@/types';

interface CourtFiltersProps {
  onFilterChange: (filters: { name?: string; sportType?: SportType; district?: string }) => void;
}

// Sport type options
const sportTypeOptions: { value: SportType | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'badminton' as SportType, label: 'Cầu lông' },
  { value: 'tennis' as SportType, label: 'Tennis' },
  { value: 'football' as SportType, label: 'Bóng đá' },
  { value: 'basketball' as SportType, label: 'Bóng rổ' },
  { value: 'volleyball' as SportType, label: 'Bóng chuyền' },
];

export function CourtFilters({ onFilterChange }: CourtFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sportType, setSportType] = useState<SportType | ''>('');
  const [district, setDistrict] = useState<string>('');

  const { data: districts = [] } = useDistricts();

  // Debounce search term (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({
        name: searchTerm || undefined,
        sportType: sportType || undefined,
        district: district || undefined,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm, sportType, district, onFilterChange]);

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Tìm kiếm theo tên sân..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Sport Type Dropdown */}
      <div className="sm:w-48">
        <select
          value={sportType}
          onChange={(e) => setSportType(e.target.value as SportType | '')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {sportTypeOptions.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* District Dropdown (REQ-21.3) */}
      <div className="sm:w-48">
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Tất cả khu vực</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
