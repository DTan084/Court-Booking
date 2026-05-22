import { Metadata } from 'next';
import { CheckoutClient } from './checkout-client';

export const metadata: Metadata = {
  title: 'Checkout | Court Booking',
  description: 'Complete your sport facility booking payment',
  robots: {
    index: false,
    follow: false,
  },
};

interface CheckoutPageProps {
  params: Promise<{
    bookingId: string;
  }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { bookingId } = await params;
  return (
    <div className="container mx-auto py-10 animate-in fade-in duration-500">
      <CheckoutClient bookingId={bookingId} />
    </div>
  );
}
