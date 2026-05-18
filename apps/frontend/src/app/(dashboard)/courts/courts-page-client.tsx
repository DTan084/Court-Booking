'use client';

import { useCallback, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CourtCard } from '@/components/courts/CourtCard';
import { CourtFilters, type CourtsSort } from '@/components/courts/CourtFilters';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/shared/Pagination';
import { useCourts, useDistricts } from '@/hooks/useCourts';
import type { CourtType } from '@/types';

const PER_PAGE = 6;

export default function CourtsPage() {
  const [page, setPage] = useState(1);
  const [name, setName] = useState<string | undefined>(undefined);
  const [districts, setDistricts] = useState<string[]>([]);
  const [sportTypeIds, setSportTypeIds] = useState<string[]>([]);
  const [courtType, setCourtType] = useState<CourtType | undefined>(undefined);
  const [featureIds, setFeatureIds] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState(50000);
  const [maxPrice, setMaxPrice] = useState(1000000);
  const [minPlayers, setMinPlayers] = useState(1);
  const [maxPlayers, setMaxPlayers] = useState(20);
  const [availableToday, setAvailableToday] = useState(false);
  const [sortBy, setSortBy] = useState<CourtsSort>('popular');

  const queryParams = useMemo(
    () => ({
      page,
      limit: PER_PAGE,
      name,
      district: districts.length > 0 ? districts : undefined,
      sportTypeId: sportTypeIds.length > 0 ? sportTypeIds : undefined,
      courtType,
      featureIds: featureIds.length > 0 ? featureIds : undefined,
      minPrice: minPrice > 50000 ? minPrice : undefined,
      maxPrice: maxPrice < 1000000 ? maxPrice : undefined,
      minPlayers: minPlayers > 1 ? minPlayers : undefined,
      maxPlayers: maxPlayers < 20 ? maxPlayers : undefined,
      availableToday: availableToday || undefined,
    }),
    [
      page,
      name,
      districts,
      sportTypeIds,
      courtType,
      featureIds,
      minPrice,
      maxPrice,
      minPlayers,
      maxPlayers,
      availableToday,
    ],
  );

  const { data, isLoading, error } = useCourts(queryParams);
  const { data: districtOptions = [] } = useDistricts();

  const filteredData = useMemo(() => {
    if (!data) return data;
    const list = [...data.data];
    list.sort((a, b) => {
      if (sortBy === 'price_asc') return Number(a.pricePerHour) - Number(b.pricePerHour);
      if (sortBy === 'price_desc') return Number(b.pricePerHour) - Number(a.pricePerHour);
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });
    return { ...data, data: list };
  }, [data, sortBy]);

  const handleFilterChange = useCallback(
    (filters: {
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
    }) => {
      setName(filters.name);
      setDistricts(filters.districts);
      setSportTypeIds(filters.sportTypeIds);
      setCourtType(filters.courtType);
      setFeatureIds(filters.featureIds);
      setMinPrice(filters.minPrice);
      setMaxPrice(filters.maxPrice);
      setMinPlayers(filters.minPlayers);
      setMaxPlayers(filters.maxPlayers);
      setAvailableToday(filters.availableToday);
      setSortBy(filters.sortBy);
      setPage(1);
    },
    [],
  );

  const hasActiveFilters = useMemo(
    () =>
      !!name ||
      districts.length > 0 ||
      sportTypeIds.length > 0 ||
      !!courtType ||
      featureIds.length > 0 ||
      minPrice > 50000 ||
      maxPrice < 1000000 ||
      minPlayers > 1 ||
      maxPlayers < 20 ||
      availableToday ||
      sortBy !== 'popular',
    [
      name,
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
    ],
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-8 md:py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#0b1c30]">Available Venues</h1>
        <p className="mt-2 text-slate-600">
          Search bookable tennis, badminton, basketball, and multi-sport courts with live filters
          for price, features, and schedule fit.
        </p>
      </div>
      <CourtFilters districtOptions={districtOptions} onFilterChange={handleFilterChange}>
        {isLoading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            <SkeletonCard count={6} />
          </div>
        )}
        {error && (
          <EmptyState
            icon={Search}
            title="Unable to load venues"
            description="An error occurred while loading courts. Please try again later."
          />
        )}
        {!isLoading && !error && filteredData && filteredData.data.length === 0 && (
          <EmptyState
            icon={Search}
            title={hasActiveFilters ? 'No venues found' : 'No venues available'}
            description={
              hasActiveFilters
                ? 'No courts match your current filters. Try adjusting your search.'
                : 'There are no courts in the system yet.'
            }
          />
        )}
        {!isLoading && !error && filteredData && filteredData.data.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredData.data.map((court) => (
                <CourtCard key={court.id} court={court} />
              ))}
            </div>
            {filteredData.meta.totalPages > 1 && (
              <div className="mt-10">
                <Pagination
                  page={filteredData.meta.page}
                  totalPages={filteredData.meta.totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </CourtFilters>
    </div>
  );
}
