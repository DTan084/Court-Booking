'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CalendarDays,
  CopyPlus,
  Dumbbell,
  DollarSign,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/courts', label: 'Courts', icon: Dumbbell },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/admin/slot-templates', label: 'Slot Templates', icon: CopyPlus },
  { href: '/admin/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/stats', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f8f9ff]">
      <div>
        <aside className="fixed left-0 top-16 z-20 hidden h-[calc(100vh-64px)] w-64 border-r border-slate-200 bg-slate-50 lg:block">
          <div className="p-6">
            <h2 className="text-xl font-black tracking-tighter text-slate-900">CourtManager</h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              Admin Panel
            </p>
          </div>
          <nav className="space-y-1 px-3">
            {items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition',
                    active
                      ? 'bg-orange-50 font-bold text-[#944a00] ring-1 ring-orange-100'
                      : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="w-full lg:pl-64">
          <header className="sticky top-16 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex h-16 w-full items-center justify-between px-4 md:px-8">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
                {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
              </div>
            </div>
          </header>

          <div className="w-full p-4 md:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
