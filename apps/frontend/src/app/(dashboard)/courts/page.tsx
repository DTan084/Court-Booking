import type { Metadata } from 'next';
import { SITE_NAME, getAbsoluteUrl } from '@/lib/site';
import CourtsPageClient from './courts-page-client';

export const metadata: Metadata = {
  title: 'Browse Sports Courts and Venues',
  description:
    'Browse tennis, badminton, basketball, and multi-sport courts with filters for sport, price, features, and availability.',
  alternates: {
    canonical: getAbsoluteUrl('/courts'),
  },
  openGraph: {
    title: `Browse Sports Courts and Venues | ${SITE_NAME}`,
    description:
      'Find courts by sport, price, capacity, and amenities before booking your next session online.',
    url: getAbsoluteUrl('/courts'),
  },
  twitter: {
    title: `Browse Sports Courts and Venues | ${SITE_NAME}`,
    description:
      'Search sports courts by availability, features, and price before you reserve your next game.',
  },
};

export default function CourtsPage() {
  return <CourtsPageClient />;
}
