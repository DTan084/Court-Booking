'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useCourts } from '@/hooks/useCourts';
import { CourtCard } from '@/components/courts/CourtCard';
import { CourtFilters } from '@/components/courts/CourtFilters';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/shared/Pagination';
import type { SportType } from '@/types';

export default function CourtsPage() {
  const [page, setPage] = useState(1);
  const [name, setName] = useState<string | undefined>(undefined);
  const [sportType, setSportType] = useState<SportType | undefined>(undefined);

  const limit = 12; // 12 courts per page

  // Fetch courts with current filters
  const { data, isLoading, error } = useCourts({
    page,
    limit,
    name,
    sportType,
  });

  // Handle filter change
  const handleFilterChange = (filters: { name?: string; sportType?: SportType }) => {
    setName(filters.name);
    setSportType(filters.sportType);
    setPage(1); // Reset to page 1 when filters change
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = name || sportType;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Danh sách sân</h1>
        <p className="text-muted-foreground">Tìm kiếm và đặt sân thể thao phù hợp với bạn</p>
      </div>

      {/* Filters */}
      <CourtFilters onFilterChange={handleFilterChange} />

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <SkeletonCard count={12} />
        </div>
      )}

      {/* Error State */}
      {error && (
        <EmptyState
          icon={Search}
          title="Không thể tải danh sách sân"
          description="Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau."
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && data && data.data.length === 0 && (
        <div>
          <EmptyState
            icon={Search}
            title={hasActiveFilters ? 'Không tìm thấy sân' : 'Chưa có sân nào'}
            description={
              hasActiveFilters
                ? 'Không có sân nào phù hợp với bộ lọc của bạn. Thử thay đổi bộ lọc.'
                : 'Hiện tại chưa có sân nào trong hệ thống.'
            }
          />
          {hasActiveFilters && (
            <div className="mt-4 text-center">
              <button
                onClick={() => handleFilterChange({ name: undefined, sportType: undefined })}
                className="text-sm text-primary hover:underline"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      )}

      {/* Court Grid */}
      {!isLoading && !error && data && data.data.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.data.map((court) => (
              <CourtCard key={court.id} court={court} />
            ))}
          </div>

          {/* Pagination */}
          {data.meta.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                page={page}
                totalPages={data.meta.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}

          {/* Results Summary */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, data.meta.total)} trong tổng
            số {data.meta.total} sân
          </div>
        </>
      )}
    </div>
  );
}
