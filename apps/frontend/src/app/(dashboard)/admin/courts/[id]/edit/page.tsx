'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CourtImageManager } from '@/components/admin/CourtImageManager';

export default function AdminCourtEditPage() {
  const params = useParams<{ id: string }>();
  const courtId = params.id;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <Link href="/admin/courts" className="text-sm text-[#944a00] hover:underline">
        ← Quay lại danh sách sân
      </Link>
      <h1 className="text-2xl font-bold">Quản lý hình ảnh sân</h1>
      <CourtImageManager courtId={courtId} />
    </div>
  );
}
