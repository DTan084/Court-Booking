'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth';
import { api } from '@/lib/api';
import { Navbar } from '@/components/shared/Navbar';
import { User } from '@/types';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [isHydrating, setIsHydrating] = useState(false);

  useEffect(() => {
    // Only hydrate if we don't have user in store and haven't tried yet
    if (!user && !isHydrating) {
      setIsHydrating(true);

      api
        .get<any>('/auth/me')
        .then((response) => {
          // Backend wraps response: { success, data: { user }, meta }
          const userData = response.data.data || response.data;
          setUser(userData);
        })
        .catch((error) => {
          // Silently fail - user is not logged in
          // 401 will be handled by axios interceptor if needed
          if (error.response?.status === 401) {
            clearUser();
          }
        })
        .finally(() => {
          setIsHydrating(false);
        });
    }
  }, [user, setUser, clearUser, isHydrating]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-6">{children}</main>
    </div>
  );
}
