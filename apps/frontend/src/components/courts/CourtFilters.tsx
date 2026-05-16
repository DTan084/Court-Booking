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
    minPrice: number;
    maxPrice: number;
    minPlayers: number;
    maxPlayers: number;
    availableToday: boolean;
    sortBy: CourtsSort;
  }) => void;
  children?: ReactNode;
}

const courtTypeOptions: Array<{ value?: CourtType; label: string }> = [
  { label: 'All' },
  { value: CourtTypeEnum.INDOOR, label: 'Indoor' },
  { value: CourtTypeEnum.OUTDOOR, label: 'Outdoor' },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function parseDraftNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function RangeSlider({
  min,
  max,
  step,
  lowerValue,
  upperValue,
  onLowerChange,
  onUpperChange,
}: {
  min: number;
  max: number;
  step: number;
  lowerValue: number;
  upperValue: number;
  onLowerChange: (value: number) => void;
  onUpperChange: (value: number) => void;
}) {
  const minPercent = ((lowerValue - min) / (max - min)) * 100;
  const maxPercent = ((upperValue - min) / (max - min)) * 100;

  return (
    <div className="relative mt-3 h-7">
      <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />
      <div
        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#944a00]"
        style={{
          left: `${minPercent}%`,
          right: `${100 - maxPercent}%`,
        }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={lowerValue}
        onChange={(e) => onLowerChange(Number(e.target.value))}
        className="pointer-events-none absolute inset-0 z-10 h-7 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#944a00] [&::-webkit-slider-thumb]:bg-[#944a00] [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[#944a00] [&::-moz-range-thumb]:bg-[#944a00] [&::-moz-range-thumb]:shadow-sm"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={upperValue}
        onChange={(e) => onUpperChange(Number(e.target.value))}
        className="pointer-events-none absolute inset-0 z-20 h-7 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#944a00] [&::-webkit-slider-thumb]:bg-[#944a00] [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[#944a00] [&::-moz-range-thumb]:bg-[#944a00] [&::-moz-range-thumb]:shadow-sm"
      />
    </div>
  );
}

export function CourtFilters({
  districtOptions = [],
  onFilterChange,
  children,
}: CourtFiltersProps) {
  const PRICE_MIN = 50000;
  const PRICE_MAX = 1000000;
  const PLAYERS_MIN = 1;
  const PLAYERS_MAX = 20;

  const [searchTerm, setSearchTerm] = useState('');
  const [districts, setDistricts] = useState<string[]>([]);
  const [sportTypeIds, setSportTypeIds] = useState<string[]>([]);
  const [courtType, setCourtType] = useState<CourtType | undefined>(undefined);
  const [featureIds, setFeatureIds] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState(PRICE_MIN);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [minPlayers, setMinPlayers] = useState(PLAYERS_MIN);
  const [maxPlayers, setMaxPlayers] = useState(PLAYERS_MAX);
  const [minPriceInput, setMinPriceInput] = useState(String(PRICE_MIN));
  const [maxPriceInput, setMaxPriceInput] = useState(String(PRICE_MAX));
  const [minPlayersInput, setMinPlayersInput] = useState(String(PLAYERS_MIN));
  const [maxPlayersInput, setMaxPlayersInput] = useState(String(PLAYERS_MAX));
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
        minPrice,
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
    minPrice,
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
    setMinPrice(PRICE_MIN);
    setMaxPrice(PRICE_MAX);
    setMinPlayers(PLAYERS_MIN);
    setMaxPlayers(PLAYERS_MAX);
    setMinPriceInput(String(PRICE_MIN));
    setMaxPriceInput(String(PRICE_MAX));
    setMinPlayersInput(String(PLAYERS_MIN));
    setMaxPlayersInput(String(PLAYERS_MAX));
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
              Amenities{' '}
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
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <input
                type="text"
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={10000}
                inputMode="numeric"
                value={minPriceInput}
                onChange={(e) => {
                  setMinPriceInput(e.target.value.replace(/[^\d]/g, ''));
                }}
                onBlur={() => {
                  const parsed = parseDraftNumber(minPriceInput);
                  const next = clamp(parsed ?? PRICE_MIN, PRICE_MIN, PRICE_MAX);
                  const applied = Math.min(next, maxPrice);
                  setMinPrice(applied);
                  setMinPriceInput(String(applied));
                }}
                className="h-10 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-right text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-sm text-slate-400">-</span>
              <input
                type="text"
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={10000}
                inputMode="numeric"
                value={maxPriceInput}
                onChange={(e) => {
                  setMaxPriceInput(e.target.value.replace(/[^\d]/g, ''));
                }}
                onBlur={() => {
                  const parsed = parseDraftNumber(maxPriceInput);
                  const next = clamp(parsed ?? PRICE_MAX, PRICE_MIN, PRICE_MAX);
                  const applied = Math.max(next, minPrice);
                  setMaxPrice(applied);
                  setMaxPriceInput(String(applied));
                }}
                className="h-10 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-right text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <RangeSlider
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={10000}
              lowerValue={minPrice}
              upperValue={maxPrice}
              onLowerChange={(next) => {
                const applied = Math.min(next, maxPrice);
                setMinPrice(applied);
                setMinPriceInput(String(applied));
              }}
              onUpperChange={(next) => {
                const applied = Math.max(next, minPrice);
                setMaxPrice(applied);
                setMaxPriceInput(String(applied));
              }}
            />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{minPrice.toLocaleString('vi-VN')} VND</span>
              <span>{maxPrice.toLocaleString('vi-VN')} VND</span>
            </div>
          </div>
          <div className="mb-6 border-t border-slate-100 pt-5">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Players Capacity
            </h4>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <input
                type="text"
                min={PLAYERS_MIN}
                max={PLAYERS_MAX}
                step={1}
                inputMode="numeric"
                value={minPlayersInput}
                onChange={(e) => {
                  setMinPlayersInput(e.target.value.replace(/[^\d]/g, ''));
                }}
                onBlur={() => {
                  const parsed = parseDraftNumber(minPlayersInput);
                  const next = clamp(parsed ?? PLAYERS_MIN, PLAYERS_MIN, PLAYERS_MAX);
                  const applied = Math.min(next, maxPlayers);
                  setMinPlayers(applied);
                  setMinPlayersInput(String(applied));
                }}
                className="h-10 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-right text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-sm text-slate-400">-</span>
              <input
                type="text"
                min={PLAYERS_MIN}
                max={PLAYERS_MAX}
                step={1}
                inputMode="numeric"
                value={maxPlayersInput}
                onChange={(e) => {
                  setMaxPlayersInput(e.target.value.replace(/[^\d]/g, ''));
                }}
                onBlur={() => {
                  const parsed = parseDraftNumber(maxPlayersInput);
                  const next = clamp(parsed ?? PLAYERS_MAX, PLAYERS_MIN, PLAYERS_MAX);
                  const applied = Math.max(next, minPlayers);
                  setMaxPlayers(applied);
                  setMaxPlayersInput(String(applied));
                }}
                className="h-10 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-right text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <RangeSlider
              min={PLAYERS_MIN}
              max={PLAYERS_MAX}
              step={1}
              lowerValue={minPlayers}
              upperValue={maxPlayers}
              onLowerChange={(next) => {
                const applied = Math.min(next, maxPlayers);
                setMinPlayers(applied);
                setMinPlayersInput(String(applied));
              }}
              onUpperChange={(next) => {
                const applied = Math.max(next, minPlayers);
                setMaxPlayers(applied);
                setMaxPlayersInput(String(applied));
              }}
            />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{minPlayers}</span>
              <span>{maxPlayers}</span>
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
