'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { CourtCard } from '@/components/courts/CourtCard';
import {
  CourtFilters,
  type CourtTypeFilter,
  type CourtsSort,
} from '@/components/courts/CourtFilters';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/shared/Pagination';
import { CourtStatus, type Court, type PaginatedResult, type SportType } from '@/types';

const PER_PAGE = 2;
const FETCH_LIMIT = 50;

type CourtsPayload =
  | PaginatedResult<Court>
  | {
      data?: Court[];
      meta?: { total?: number; page?: number; limit?: number; totalPages?: number };
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    };

function normalizeCourts(payload: CourtsPayload, fallbackPage: number): PaginatedResult<Court> {
  const list = Array.isArray((payload as PaginatedResult<Court>)?.data)
    ? ((payload as PaginatedResult<Court>).data ?? [])
    : [];

  const metaFromPayload = (payload as { meta?: PaginatedResult<Court>['meta'] }).meta;
  const total = metaFromPayload?.total ?? (payload as { total?: number }).total ?? list.length;
  const page = metaFromPayload?.page ?? (payload as { page?: number }).page ?? fallbackPage;
  const limit = metaFromPayload?.limit ?? (payload as { limit?: number }).limit ?? PER_PAGE;
  const totalPages =
    metaFromPayload?.totalPages ??
    (payload as { totalPages?: number }).totalPages ??
    Math.max(1, Math.ceil(total / Math.max(1, limit)));

  return {
    data: list,
    meta: { total, page, limit, totalPages },
  };
}

export default function CourtsPage() {
  const [page, setPage] = useState(1);
  const [name, setName] = useState<string | undefined>(undefined);
  const [districts, setDistricts] = useState<string[]>([]);
  const [sportTypes, setSportTypes] = useState<SportType[]>([]);
  const [courtType, setCourtType] = useState<CourtTypeFilter>('all');
  const [maxPrice, setMaxPrice] = useState(1000000);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<CourtsSort>('popular');

  const sportTypesKey = useMemo(() => [...sportTypes].sort().join(','), [sportTypes]);
  const districtsKey = useMemo(() => [...districts].sort().join(','), [districts]);

  const districtsQuery = useQuery({
    queryKey: ['courts-districts'],
    queryFn: async () => {
      try {
        const res = await api.get('/courts/districts');
        const payload = res.data?.data ?? res.data;
        return Array.isArray(payload) ? payload.filter(Boolean) : [];
      } catch {
        return [] as string[];
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: [
      'courts-page',
      page,
      name,
      districtsKey,
      sportTypesKey,
      courtType,
      maxPrice,
      availableOnly,
      sortBy,
    ],
    queryFn: async () => {
      const sportList = sportTypes.length > 0 ? sportTypes : [undefined];
      const responses = await Promise.all(
        sportList.map((sportType) =>
          api.get('/courts', {
            params: {
              page: 1,
              limit: FETCH_LIMIT,
              name,
              sportType,
            },
          }),
        ),
      );

      const merged = responses.flatMap(
        (r) => normalizeCourts((r.data?.data ?? r.data ?? {}) as CourtsPayload, 1).data,
      );

      let list = Array.from(new Map(merged.map((court) => [court.id, court])).values());

      if (districts.length > 0) {
        const selected = new Set(districts.map((d) => d.toLowerCase()));
        list = list.filter((court) => court.district && selected.has(court.district.toLowerCase()));
      }

      list = list.filter((court) => Number(court.pricePerHour) <= maxPrice);

      if (availableOnly) {
        list = list.filter((court) => court.status === CourtStatus.ACTIVE);
      }

      if (courtType !== 'all') {
        list = list.filter((court) => {
          const marker = `${court.description ?? ''} ${court.name}`.toLowerCase();
          return marker.includes(courtType);
        });
      }

      list.sort((a, b) => {
        if (sortBy === 'price_asc') return Number(a.pricePerHour) - Number(b.pricePerHour);
        if (sortBy === 'price_desc') return Number(b.pricePerHour) - Number(a.pricePerHour);
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        return 0;
      });

      const fallbackDistrictOptions = Array.from(
        new Set(
          merged
            .map((court) => court.district)
            .filter((v): v is string => typeof v === 'string' && v.trim().length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b));

      const total = list.length;
      const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
      const currentPage = Math.min(page, totalPages);
      const start = (currentPage - 1) * PER_PAGE;
      const paged = list.slice(start, start + PER_PAGE);

      return {
        data: paged,
        meta: {
          total,
          page: currentPage,
          limit: PER_PAGE,
          totalPages,
        },
        fallbackDistrictOptions,
      };
    },
    placeholderData: (prev) => prev,
  });

  const handleFilterChange = useCallback(
    (filters: {
      name?: string;
      districts: string[];
      sportTypes: SportType[];
      courtType: CourtTypeFilter;
      maxPrice: number;
      availableOnly: boolean;
      sortBy: CourtsSort;
    }) => {
      setName(filters.name);
      setDistricts(filters.districts);
      setSportTypes(filters.sportTypes);
      setCourtType(filters.courtType);
      setMaxPrice(filters.maxPrice);
      setAvailableOnly(filters.availableOnly);
      setSortBy(filters.sortBy);
      setPage(1);
    },
    [],
  );

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const districtOptions = useMemo(() => {
    const fromApi = Array.isArray(districtsQuery.data) ? districtsQuery.data : [];
    const fallback = data?.fallbackDistrictOptions ?? [];
    return Array.from(new Set([...fromApi, ...fallback])).sort((a, b) => a.localeCompare(b));
  }, [districtsQuery.data, data?.fallbackDistrictOptions]);

  const hasActiveFilters = useMemo(
    () =>
      !!name ||
      districts.length > 0 ||
      sportTypes.length > 0 ||
      courtType !== 'all' ||
      maxPrice < 1000000 ||
      availableOnly ||
      sortBy !== 'popular',
    [name, districts, sportTypes, courtType, maxPrice, availableOnly, sortBy],
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-8 md:py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0b1c30]">
            Available Venues
          </h1>
          <p className="mt-2 text-slate-600">
            Find and book professional-grade sports facilities near you.
          </p>
        </div>
      </div>

      <CourtFilters districtOptions={districtOptions} onFilterChange={handleFilterChange}>
        {isLoading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            <SkeletonCard count={12} />
          </div>
        )}

        {error && (
          <EmptyState
            icon={Search}
            title="Unable to load venues"
            description="An error occurred while loading courts. Please try again later."
          />
        )}

        {!isLoading && !error && data && data.data.length === 0 && (
          <div>
            <EmptyState
              icon={Search}
              title={hasActiveFilters ? 'No venues found' : 'No venues available'}
              description={
                hasActiveFilters
                  ? 'No courts match your current filters. Try adjusting your search.'
                  : 'There are no courts in the system yet.'
              }
            />
          </div>
        )}

        {!isLoading && !error && data && data.data.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {data.data.map((court) => (
                <CourtCard key={court.id} court={court} />
              ))}
            </div>

            {data.meta.totalPages > 1 && (
              <div className="mt-10">
                <Pagination
                  page={data.meta.page}
                  totalPages={data.meta.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </CourtFilters>
    </div>
  );
}
