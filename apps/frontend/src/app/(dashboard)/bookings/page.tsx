import type { Metadata } from 'next';
import BookingsPageClient from './bookings-page-client';

export const metadata: Metadata = {
  title: 'My Bookings',
  description: 'Review your live, upcoming, and past court bookings.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function BookingsPage() {
  return <BookingsPageClient />;
}
