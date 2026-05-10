'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useBooking, useConfirmPayment } from '@/hooks/useBookings';
import { BookingStatus } from '@/types';
import { CountdownTimer } from '@/components/bookings/countdown-timer';
import { DoubleConfirmationDialog } from '@/components/shared/double-confirmation-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

interface CheckoutClientProps {
  bookingId: string;
}

export function CheckoutClient({ bookingId }: CheckoutClientProps) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [localExpired, setLocalExpired] = React.useState(false);

  // REQ-18.10: Poll every 30 seconds
  const {
    data: booking,
    isLoading,
    isError,
  } = useBooking(bookingId, {
    refetchInterval: 30000,
  });

  const confirmPayment = useConfirmPayment();

  // REQ-18.9: Redirect if already confirmed
  React.useEffect(() => {
    if (booking?.status === BookingStatus.CONFIRMED) {
      toast.info('Booking này đã được thanh toán');
      router.push('/bookings');
    }
  }, [booking, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Không tìm thấy thông tin đặt sân</h2>
        <Button onClick={() => router.push('/courts')}>Quay lại danh sách sân</Button>
      </div>
    );
  }

  const handleConfirm = async () => {
    try {
      await confirmPayment.mutateAsync(bookingId);
      setIsConfirmOpen(false);
    } catch {
      // Error handled by mutation
      setIsConfirmOpen(false);
    }
  };

  const isExpired = booking.status === BookingStatus.EXPIRED || localExpired;

  // REQ-18.7: Success View
  if (booking.status === BookingStatus.CONFIRMED) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
          </div>
        </div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Đặt sân thành công!</h1>
        <p className="mb-8 text-gray-600">
          Cảm ơn bạn đã sử dụng dịch vụ. Mã đặt sân của bạn là{' '}
          <span className="font-mono font-bold">{booking.id.slice(0, 8)}</span>.
        </p>

        <Card className="mb-8 overflow-hidden border-none shadow-xl ring-1 ring-gray-200">
          <CardHeader className="bg-gray-50 text-left border-b">
            <CardTitle className="text-lg">Chi tiết đặt sân</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4 text-left">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold">{booking.court?.name}</p>
                <p className="text-sm text-gray-500">{booking.court?.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <p>{format(new Date(booking.startTime), 'EEEE, dd/MM/yyyy', { locale: vi })}</p>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <p>
                {format(new Date(booking.startTime), 'HH:mm')} -{' '}
                {format(new Date(booking.endTime), 'HH:mm')}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="px-8" onClick={() => router.push('/bookings')}>
            Xem lịch đặt
          </Button>
          <Button variant="outline" size="lg" onClick={() => router.push('/courts')}>
            Tiếp tục đặt sân
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-8 px-4">
      <Button variant="ghost" className="mb-6 gap-2" onClick={() => router.back()}>
        <ChevronLeft className="h-4 w-4" /> Quay lại
      </Button>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left column: Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-none shadow-lg ring-1 ring-gray-100">
            <CardHeader className="border-b bg-gray-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Xác nhận thanh toán</CardTitle>
                <Badge variant={isExpired ? 'destructive' : 'secondary'} className="px-3 py-1">
                  {isExpired ? 'ĐÃ HẾT HẠN' : 'CHỜ THANH TOÁN'}
                </Badge>
              </div>
              <CardDescription>
                Vui lòng thanh toán để hoàn tất việc đặt sân của bạn.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{booking.court?.name}</h3>
                  <p className="text-gray-500">{booking.court?.address}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border p-4">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Ngày</p>
                    <p className="font-semibold">
                      {format(new Date(booking.startTime), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border p-4">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                      Thời gian
                    </p>
                    <p className="font-semibold">
                      {format(new Date(booking.startTime), 'HH:mm')} -{' '}
                      {format(new Date(booking.endTime), 'HH:mm')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600">Đơn giá</span>
                  <span className="font-semibold">
                    {(booking.court?.pricePerHour || 0).toLocaleString()}đ / giờ
                  </span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-lg font-bold">Tổng cộng</span>
                  <span className="text-2xl font-bold text-primary">
                    {(booking.totalPrice || 0).toLocaleString()}đ
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Action / Timer */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl ring-1 ring-primary/20 bg-gradient-to-b from-white to-primary/5">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                Thời gian còn lại
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center pb-8 pt-2">
              {booking.paymentDeadline && (
                <CountdownTimer
                  deadline={booking.paymentDeadline}
                  onExpire={() => setLocalExpired(true)}
                  className="mb-6 scale-125"
                />
              )}

              {!isExpired ? (
                <Button
                  size="lg"
                  className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20"
                  onClick={() => setIsConfirmOpen(true)}
                >
                  <CreditCard className="mr-2 h-5 w-5" /> Xác nhận thanh toán
                </Button>
              ) : (
                <div className="w-full space-y-4">
                  <div className="rounded-lg bg-destructive/10 p-4 text-center text-destructive border border-destructive/20">
                    <p className="font-bold">Đặt sân đã hết hạn thanh toán</p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full h-12"
                    onClick={() => router.push(`/courts/${booking.courtId}`)}
                  >
                    Đặt sân mới
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-primary/5 border-t py-4 justify-center">
              <p className="text-xs text-gray-400">Thanh toán an toàn qua cổng tích hợp</p>
            </CardFooter>
          </Card>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" /> Lưu ý
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc pl-4">
              <li>Thanh toán trong vòng 30 phút để giữ chỗ.</li>
              <li>Chỗ sẽ được giải phóng nếu hết thời gian.</li>
              <li>Có thể hủy trong 24h nếu cách giờ chơi &gt; 12h.</li>
            </ul>
          </div>
        </div>
      </div>

      <DoubleConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        isLoading={confirmPayment.isPending}
        title="Xác nhận thanh toán"
        description={
          <span>
            Xác nhận thanh toán <strong>{(booking.totalPrice || 0).toLocaleString()}đ</strong> cho
            sân <strong>{booking.court?.name}</strong> lúc{' '}
            <strong>{format(new Date(booking.startTime), 'HH:mm')}</strong>?
          </span>
        }
      />
    </div>
  );
}
