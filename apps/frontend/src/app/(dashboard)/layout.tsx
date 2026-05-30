'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { api } from '@/lib/api';
import { Navbar } from '@/components/shared/Navbar';
import { SiteFooter } from '@/components/shared/SiteFooter';
import { User } from '@/types';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  // Use ref to ensure we only attempt hydration once per mount, not on every render
  const hasFetched = useRef(false);
  const isCheckoutRoute = pathname.startsWith('/checkout/');
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAccountRoute = pathname === '/profile' || pathname.startsWith('/bookings');

  useEffect(() => {
    if (hasFetched.current) return;

    hasFetched.current = true;

    api
      .get<{ success: boolean; data: User }>('/auth/me')
      .then((response) => {
        const userData = response.data.data || (response.data as unknown as User);
        setUser(userData);
      })
      .catch(() => {
        // Silently fail: user is not logged in, middleware will redirect if needed.
        clearUser();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main
        className={isCheckoutRoute || isAdminRoute || isAccountRoute ? 'w-full' : 'container py-6'}
      >
        {children}
      </main>
      <div className={isAdminRoute || isAccountRoute ? 'lg:pl-64' : ''}>
        <SiteFooter />
      </div>
    </div>
  );
}
