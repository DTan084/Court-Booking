'use client';

import { useAuthStore } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HomePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="max-w-2xl text-center space-y-8">
        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">
            Chào mừng đến với <span className="text-primary">Court Booking</span>
          </h1>
          <p className="text-xl text-muted-foreground">Nền tảng đặt sân thể thao trực tuyến</p>
        </div>

        {/* User Greeting */}
        {user && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
            <p className="text-lg">
              Xin chào, <span className="font-semibold">{user.name}</span>! 👋
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {user.role === 'admin'
                ? 'Bạn đang đăng nhập với quyền quản trị viên'
                : 'Bạn đã đăng nhập thành công'}
            </p>
          </div>
        )}

        {/* Features Coming Soon */}
        <div className="grid gap-4 md:grid-cols-2 text-left">
          <div className="border rounded-lg p-6 space-y-2">
            <div className="text-2xl">🎾</div>
            <h3 className="font-semibold">Danh sách sân</h3>
            <p className="text-sm text-muted-foreground">Xem và tìm kiếm các sân thể thao có sẵn</p>
            <p className="text-xs text-yellow-600 font-medium">Đang phát triển - Sprint 2</p>
          </div>

          <div className="border rounded-lg p-6 space-y-2">
            <div className="text-2xl">📅</div>
            <h3 className="font-semibold">Đặt sân</h3>
            <p className="text-sm text-muted-foreground">Chọn thời gian và đặt sân trực tuyến</p>
            <p className="text-xs text-yellow-600 font-medium">Đang phát triển - Sprint 2</p>
          </div>

          <div className="border rounded-lg p-6 space-y-2">
            <div className="text-2xl">📋</div>
            <h3 className="font-semibold">Lịch đặt của tôi</h3>
            <p className="text-sm text-muted-foreground">Quản lý các booking của bạn</p>
            <p className="text-xs text-yellow-600 font-medium">Đang phát triển - Sprint 2</p>
          </div>

          {user?.role === 'admin' && (
            <div className="border rounded-lg p-6 space-y-2">
              <div className="text-2xl">⚙️</div>
              <h3 className="font-semibold">Quản trị</h3>
              <p className="text-sm text-muted-foreground">Quản lý sân và xem thống kê</p>
              <p className="text-xs text-yellow-600 font-medium">Đang phát triển - Sprint 2</p>
            </div>
          )}
        </div>

        {/* Sprint 1 Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-left">
          <h3 className="font-semibold text-green-900 mb-2">
            ✅ Sprint 1 - Foundation (Hoàn thành)
          </h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>✓ Đăng ký và đăng nhập</li>
            <li>✓ Xác thực và bảo vệ routes</li>
            <li>✓ Navbar với role-based menu</li>
            <li>✓ Error pages (404, error boundary)</li>
          </ul>
        </div>

        {/* CTA */}
        <div className="pt-4">
          <p className="text-sm text-muted-foreground">
            Các tính năng đặt sân sẽ có sẵn trong Sprint 2
          </p>
        </div>
      </div>
    </div>
  );
}
