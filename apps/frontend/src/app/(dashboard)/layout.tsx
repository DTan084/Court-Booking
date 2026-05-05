'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth';
import { api } from '@/lib/api';
import { Navbar } from '@/components/shared/Navbar';
import { User } from '@/types';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  useEffect(() => {
    // Hydrate auth store if empty
    if (!user) {
      api
        .get<User>('/auth/me')
        .then((response) => {
          setUser(response.data);
        })
        .catch((error) => {
          // 401 will be handled by axios interceptor (redirect to login)
          if (error.response?.status === 401) {
            clearUser();
          }
        });
    }
  }, [user, setUser, clearUser]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-6">{children}</main>
    </div>
  );
}
