import { Metadata } from 'next';
import { CheckoutClient } from './checkout-client';

export const metadata: Metadata = {
  title: 'Thanh toán | Court Booking',
  description: 'Hoàn tất thanh toán cho sân thể thao của bạn',
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
