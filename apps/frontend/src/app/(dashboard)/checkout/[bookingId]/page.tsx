import { Metadata } from 'next';
import { CheckoutClient } from './checkout-client';

export const metadata: Metadata = {
  title: 'Checkout | Court Booking',
  description: 'Complete your sport facility booking payment',
};

interface CheckoutPageProps {
  params: {
    bookingId: string;
  };
}

export default function CheckoutPage({ params }: CheckoutPageProps) {
  return (
    <div className="container mx-auto py-10 animate-in fade-in duration-500">
      <CheckoutClient bookingId={params.bookingId} />
    </div>
  );
}
