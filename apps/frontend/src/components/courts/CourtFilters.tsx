'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useFeatures } from '@/hooks/useFeatures';
import { useSportTypes } from '@/hooks/useSportTypes';
import { resolveFeatureIcon } from '@/lib/feature-icons';
import type { CourtType } from '@/types';
import { CourtType as CourtTypeEnum } from '@court-booking/shared';

export type CourtsSort = 'popular' | 'price_asc' | 'price_desc' | 'name_asc';

interface CourtFiltersProps {
  districtOptions?: string[];
  onFilterChange: (filters: {
    name?: string;
    districts: string[];
    sportTypeIds: string[];
    courtType?: CourtType;
    featureIds: string[];
    maxPrice: number;
    minPlayers?: number;
    maxPlayers?: number;
    availableToday: boolean;
    sortBy: CourtsSort;
  }) => void;
  children?: ReactNode;
}

const courtTypeOptions: Array<{ value?: CourtType; label: string }> = [
  { label: 'Tất cả' },
  { value: CourtTypeEnum.INDOOR, label: 'Trong nhà' },
  { value: CourtTypeEnum.OUTDOOR, label: 'Ngoài trời' },
];

export function CourtFilters({
  districtOptions = [],
  onFilterChange,
  children,
}: CourtFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [districts, setDistricts] = useState<string[]>([]);
  const [sportTypeIds, setSportTypeIds] = useState<string[]>([]);
  const [courtType, setCourtType] = useState<CourtType | undefined>(undefined);
  const [featureIds, setFeatureIds] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(1000000);
  const [minPlayers, setMinPlayers] = useState<number | undefined>(undefined);
  const [maxPlayers, setMaxPlayers] = useState<number | undefined>(undefined);
  const [availableToday, setAvailableToday] = useState(false);
  const [sortBy, setSortBy] = useState<CourtsSort>('popular');
  const [districtOpen, setDistrictOpen] = useState(false);
  const [sportOpen, setSportOpen] = useState(false);
  const [featureOpen, setFeatureOpen] = useState(false);
  const { data: features = [] } = useFeatures();
  const { data: sportTypes = [] } = useSportTypes();

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({
        name: searchTerm || undefined,
        districts,
        sportTypeIds,
        courtType,
        featureIds,
        maxPrice,
        minPlayers,
        maxPlayers,
        availableToday,
        sortBy,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [
    searchTerm,
    districts,
    sportTypeIds,
    courtType,
    featureIds,
    maxPrice,
    minPlayers,
    maxPlayers,
    availableToday,
    sortBy,
    onFilterChange,
  ]);

  const toggleSportType = (value: string) =>
    setSportTypeIds((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  const toggleDistrict = (value: string) =>
    setDistricts((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  const toggleFeature = (value: string) =>
    setFeatureIds((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );

  const clearAll = () => {
    setSearchTerm('');
    setDistricts([]);
    setSportTypeIds([]);
    setCourtType(undefined);
    setFeatureIds([]);
    setMaxPrice(1000000);
    setMinPlayers(undefined);
    setMaxPlayers(undefined);
    setAvailableToday(false);
    setSortBy('popular');
  };

  return (
    <div className="mb-8 space-y-6">
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_220px]">
        <Input
          type="text"
          placeholder="Search venues..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-12 rounded-xl border-slate-300 bg-[#f8f9ff] px-4 focus-visible:ring-[#fd933d]"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as CourtsSort)}
          className="h-12 rounded-xl border border-slate-300 bg-[#f8f9ff] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#fd933d]"
        >
          <option value="popular">Most Popular</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">Name A-Z</option>
        </select>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:w-72">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Filters</h3>
            <button
              type="button"
              onClick={clearAll}
              className="text-sm font-semibold text-[#944a00] hover:underline"
            >
              Clear all
            </button>
          </div>
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setDistrictOpen((v) => !v)}
              className="mb-3 flex w-full items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              Area / District{' '}
              <ChevronDown className={`h-4 w-4 transition ${districtOpen ? 'rotate-180' : ''}`} />
            </button>
            {districtOpen && (
              <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                {districtOptions.length === 0 && (
                  <p className="text-xs text-slate-500">No district data</p>
                )}
                {districtOptions.map((district) => (
                  <label key={district} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={districts.includes(district)}
                      onChange={() => toggleDistrict(district)}
                      className="rounded border-slate-300 text-[#944a00] focus:ring-[#944a00]"
                    />
                    {district}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="mb-6 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setSportOpen((v) => !v)}
              className="mb-3 flex w-full items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              Sport{' '}
              <ChevronDown className={`h-4 w-4 transition ${sportOpen ? 'rotate-180' : ''}`} />
            </button>
            {sportOpen && (
              <div className="space-y-2">
                {sportTypes.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={sportTypeIds.includes(option.id)}
                      onChange={() => toggleSportType(option.id)}
                      className="rounded border-slate-300 text-[#944a00] focus:ring-[#944a00]"
                    />
                    {option.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="mb-6 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setFeatureOpen((v) => !v)}
              className="mb-3 flex w-full items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              Tiện ích{' '}
              <ChevronDown className={`h-4 w-4 transition ${featureOpen ? 'rotate-180' : ''}`} />
            </button>
            {featureOpen && (
              <div className="space-y-2">
                {features.map((feature) => (
                  <label
                    key={feature.id}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={featureIds.includes(feature.id)}
                      onChange={() => toggleFeature(feature.id)}
                      className="rounded border-slate-300 text-[#944a00] focus:ring-[#944a00]"
                    />
                    <span className="inline-flex items-center gap-1.5">
                      {(() => {
                        const Icon = resolveFeatureIcon({ icon: feature.icon, name: feature.name });
                        return Icon ? <Icon className="h-3.5 w-3.5 text-slate-500" /> : null;
                      })()}
                      {feature.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="mb-6 border-t border-slate-100 pt-5">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Court Type
            </h4>
            <div className="flex flex-wrap gap-2">
              {courtTypeOptions.map((type) => (
                <button
                  key={type.label}
                  type="button"
                  onClick={() => setCourtType(type.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${courtType === type.value ? 'border-[#944a00] bg-orange-50 text-[#944a00]' : 'border-slate-300 text-slate-600'}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-6 border-t border-slate-100 pt-5">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Price Per Hour
            </h4>
            <input
              type="range"
              min={50000}
              max={1000000}
              step={10000}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-[#944a00]"
            />
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>50,000</span>
              <span>{maxPrice.toLocaleString('vi-VN')}</span>
            </div>
          </div>
          <div className="mb-6 border-t border-slate-100 pt-5">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Players Capacity
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min={1}
                placeholder="Min"
                value={minPlayers ?? ''}
                onChange={(e) =>
                  setMinPlayers(e.target.value ? Number.parseInt(e.target.value, 10) : undefined)
                }
                className="h-10 rounded-lg border-slate-300 bg-[#f8f9ff]"
              />
              <Input
                type="number"
                min={1}
                placeholder="Max"
                value={maxPlayers ?? ''}
                onChange={(e) =>
                  setMaxPlayers(e.target.value ? Number.parseInt(e.target.value, 10) : undefined)
                }
                className="h-10 rounded-lg border-slate-300 bg-[#f8f9ff]"
              />
            </div>
          </div>
          <div className="border-t border-slate-100 pt-5">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={availableToday}
                onChange={(e) => setAvailableToday(e.target.checked)}
                className="rounded border-slate-300 text-[#944a00] focus:ring-[#944a00]"
              />
              Available today
            </label>
          </div>
        </aside>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
