'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Image from 'next/image';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  Lock,
  MapPin,
} from 'lucide-react';
import { useBooking, useConfirmPayment } from '@/hooks/useBookings';
import { useTimeSlots } from '@/hooks/useTimeSlots';
import { BookingStatus } from '@/types';
import { CountdownTimer } from '@/components/bookings/countdown-timer';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth';
import { calculateBookingPrice, formatCurrency } from '@/lib/utils';

interface CheckoutClientProps {
  bookingId: string;
}

type Step = 'review' | 'payment' | 'confirmation';

const checkoutSteps: Array<{ key: Step; label: string }> = [
  { key: 'review', label: 'Review' },
  { key: 'payment', label: 'Payment' },
  { key: 'confirmation', label: 'Confirmation' },
];

function CheckoutSidebar({ step }: { step: Step }) {
  const stepIcons: Record<Step, React.ReactNode> = {
    review: <CheckCircle2 className="h-4 w-4" />,
    payment: <CreditCard className="h-4 w-4" />,
    confirmation: <Lock className="h-4 w-4" />,
  };

  return (
    <aside className="hidden rounded-2xl border border-slate-200 bg-slate-50 p-0 text-sm lg:sticky lg:top-24 lg:flex lg:h-fit lg:flex-col">
      <div className="px-6 py-4">
        <h2 className="text-lg font-bold text-slate-900">Booking Progress</h2>
        <p className="text-slate-500">
          Step {step === 'review' ? '1' : step === 'payment' ? '2' : '3'} of 3
        </p>
      </div>
      <nav className="flex flex-col">
        {checkoutSteps.map((item) => {
          const isActive = item.key === step;
          const isPassed =
            (step === 'payment' && item.key === 'review') ||
            (step === 'confirmation' && (item.key === 'review' || item.key === 'payment'));

          return (
            <div
              key={item.key}
              className={`flex items-center gap-3 border-b border-slate-200 px-4 py-3 ${
                isActive
                  ? 'border-r-4 border-orange-600 bg-orange-50 text-orange-600'
                  : isPassed
                    ? 'text-slate-700'
                    : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                  isActive
                    ? 'border-orange-200 bg-white text-orange-600'
                    : isPassed
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                {isPassed ? <CheckCircle2 className="h-4 w-4" /> : stepIcons[item.key]}
              </span>
              {item.label}
            </div>
          );
        })}
        <div className="mt-auto flex items-center gap-3 border-t border-slate-200 px-4 py-3 text-slate-400">
          Support
        </div>
      </nav>
    </aside>
  );
}

export function CheckoutClient({ bookingId }: CheckoutClientProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [localExpired, setLocalExpired] = React.useState(false);
  const [step, setStep] = React.useState<Step>('review');
  const [paymentCompleted, setPaymentCompleted] = React.useState(false);
  const paymentSectionRef = React.useRef<HTMLElement | null>(null);

  const [cardName, setCardName] = React.useState('');
  const [cardNumber, setCardNumber] = React.useState('');
  const [expiry, setExpiry] = React.useState('');
  const [cvv, setCvv] = React.useState('');

  const {
    data: booking,
    isLoading,
    isError,
  } = useBooking(bookingId, {
    refetchInterval: 30000,
  });
  const { data: timeSlots } = useTimeSlots(booking?.courtId || '');

  const confirmPayment = useConfirmPayment();

  const bookingDaySlots = React.useMemo(() => {
    if (!booking || !timeSlots?.length) return [];

    const dayOfWeek = new Date(booking.startTime).getDay();
    const startHour = new Date(booking.startTime).getHours();
    const endHour = new Date(booking.endTime).getHours() || 24;

    const daySlots = timeSlots
      .filter((slot) => slot.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startHour - b.startHour);

    const priceResult = calculateBookingPrice(timeSlots, dayOfWeek, startHour, endHour);

    if (priceResult?.coveredSlots?.length) {
      return priceResult.coveredSlots;
    }

    return daySlots.filter((slot) => slot.startHour >= startHour && slot.endHour <= endHour);
  }, [booking, timeSlots]);

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
        <h2 className="text-xl font-semibold">KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin Ä‘áº·t sÃ¢n</h2>
        <Button onClick={() => router.push('/courts')}>Quay láº¡i danh sÃ¡ch sÃ¢n</Button>
      </div>
    );
  }

  const isExpired = booking.status === BookingStatus.EXPIRED || localExpired;
  const hoursUntilStart = (new Date(booking.startTime).getTime() - Date.now()) / (1000 * 60 * 60);
  const isWithinNoCancelWindow = hoursUntilStart <= 12;
  const primaryCourtImage = booking.court?.images?.[0]?.url ?? null;

  const handleCompletePayment = async () => {
    try {
      await confirmPayment.mutateAsync(bookingId);
      setPaymentCompleted(true);
      setStep('confirmation');
    } catch {
      // handled by hook
    }
  };

  if (paymentCompleted && step === 'confirmation') {
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `Court Booking - ${booking.court?.name ?? 'Court'}`,
    )}&dates=${format(new Date(booking.startTime), "yyyyMMdd'T'HHmmss")}/${format(
      new Date(booking.endTime),
      "yyyyMMdd'T'HHmmss",
    )}&details=${encodeURIComponent(`Booking at ${booking.court?.name ?? 'Court'}`)}&location=${encodeURIComponent(
      booking.court?.address ?? '',
    )}`;

    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <CheckoutSidebar step="confirmation" />

          <main className="min-w-0">
            <div className="mb-12 text-center pt-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-500 text-white mb-6">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Booking Confirmed!</h1>
              <p className="text-lg text-slate-600">
                Your court is locked in. Get ready for game time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-7 space-y-8">
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="h-48 w-full relative">
                    {primaryCourtImage && (
                      <Image
                        src={primaryCourtImage}
                        alt={booking.court?.name ?? 'Court image'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 60vw"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute inset-0 flex items-end p-6">
                      <span className="text-white text-xl font-semibold">
                        {booking.court?.name}
                      </span>
                    </div>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs uppercase text-slate-500 mb-1">Date</p>
                        <p className="text-lg font-semibold">
                          {format(new Date(booking.startTime), 'EEEE, dd/MM/yyyy', { locale: vi })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-slate-500 mb-1">Time</p>
                        <p className="text-lg font-semibold">
                          {format(new Date(booking.startTime), 'HH:mm')} -{' '}
                          {format(new Date(booking.endTime), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase text-slate-500">Booking ID</p>
                        <p className="font-mono text-orange-600 font-bold">
                          #{booking.id.slice(0, 8)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase text-slate-500">Status</p>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 uppercase tracking-wider">
                          Confirmed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-100 rounded-2xl p-8 border border-slate-200">
                  <h3 className="text-xl font-semibold mb-6">Prepare for Play</h3>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-200">
                        <Calendar className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-semibold">Arrival & Check-in</p>
                        <p className="text-slate-600 text-sm mt-1">
                          Please arrive at least 15 minutes before your scheduled start time.
                          Present your Booking ID at the front desk.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-200">
                        <Clock className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-semibold">Equipment</p>
                        <p className="text-slate-600 text-sm mt-1">
                          Professional equipment is available for rent. Clean, non-marking court
                          shoes are mandatory.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-200">
                        <MapPin className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-semibold">Location</p>
                        <p className="text-slate-600 text-sm mt-1">
                          {booking.court?.address ||
                            'Please check the venue details for the exact location.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 flex flex-col gap-4">
                <button
                  className="w-full h-12 bg-orange-500 text-white font-semibold flex items-center justify-center gap-2 rounded-lg hover:brightness-95 active:scale-[0.98] transition-all"
                  onClick={() => window.open(calendarUrl, '_blank', 'noopener,noreferrer')}
                >
                  Add to Calendar
                </button>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    className="w-full h-12 border border-slate-200 text-slate-700 font-semibold flex items-center justify-center gap-2 rounded-lg hover:bg-slate-50 transition-all"
                    onClick={() => router.push('/bookings')}
                  >
                    View My Bookings
                  </button>
                  <button className="w-full h-12 border border-slate-200 text-slate-700 font-semibold flex items-center justify-center gap-2 rounded-lg hover:bg-slate-50 transition-all">
                    Print Receipt
                  </button>
                </div>

                <div className="mt-4 p-6 bg-white border border-slate-200 rounded-2xl">
                  <p className="text-slate-500 mb-4 text-sm">Need Assistance?</p>
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-800">
                    <span>Contact Support 24/7</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3 text-sm font-semibold text-slate-800">
                    <span>Cancellation Policy</span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <CheckoutSidebar step={step} />

          <main className="min-w-0">
            <div className="mb-10 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  {step === 'review' ? 'Review & Pay' : 'Secure Checkout'}
                </h1>
                <p className="text-slate-600 mt-2">
                  {step === 'review'
                    ? 'Please verify your booking details before proceeding to payment.'
                    : 'Complete your booking details below.'}
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <Lock className="h-3.5 w-3.5" />
                  SSL secured checkout
                </div>
              </div>
              <button
                className="flex items-center gap-2 text-orange-600 text-sm hover:underline"
                onClick={() => (step === 'payment' ? setStep('review') : router.back())}
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="col-span-12 lg:col-span-8 space-y-8">
                <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-8">
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex gap-6">
                        {primaryCourtImage && (
                          <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200">
                            <Image
                              src={primaryCourtImage}
                              alt={booking.court?.name ?? 'Court image'}
                              fill
                              className="object-cover"
                              sizes="96px"
                            />
                          </div>
                        )}
                        {!primaryCourtImage && (
                          <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-[linear-gradient(135deg,#dce9ff,#f8f9ff)]" />
                        )}
                        <div>
                          <h3 className="text-xl font-semibold text-slate-900 mb-1">
                            {booking.court?.name}
                          </h3>
                          <p className="text-slate-600 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {booking.court?.address}
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                              Premium Court
                            </span>
                            {booking.status === BookingStatus.PENDING_PAYMENT && (
                              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold uppercase tracking-wider text-amber-700">
                                Pending Payment
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button className="text-orange-600 text-sm hover:underline">
                        Edit Selection
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-500 mb-2">COURT</span>
                        <span className="text-lg text-slate-900 font-bold">
                          {booking.court?.name}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-500 mb-2">DATE</span>
                        <span className="text-lg text-slate-900 font-bold">
                          {format(new Date(booking.startTime), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-500 mb-2">TIME</span>
                        <span className="text-lg text-slate-900 font-bold">
                          {format(new Date(booking.startTime), 'HH:mm')} -{' '}
                          {format(new Date(booking.endTime), 'HH:mm')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-8 border-t border-slate-100 pt-8">
                      {isWithinNoCancelWindow && (
                        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          Warning: Booking này bắt đầu trong vòng 12 giờ, bạn sẽ không thể hủy theo
                          chính sách.
                        </div>
                      )}
                      <h4 className="text-lg font-semibold text-slate-900 mb-4">Selected Slots</h4>
                      <div className="space-y-3">
                        {bookingDaySlots.length > 0 ? (
                          bookingDaySlots.map((slot, index) => (
                            <div
                              key={`${slot.id}-${slot.startHour}-${slot.endHour}`}
                              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                            >
                              <div>
                                <p className="font-semibold text-slate-900">Slot {index + 1}</p>
                                <p className="text-sm text-slate-600">
                                  {String(slot.startHour).padStart(2, '0')}:00 -{' '}
                                  {String(slot.endHour).padStart(2, '0')}:00
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-[#944a00]">
                                {formatCurrency(Number(slot.price))}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                            Slot details are loading from the court schedule.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {step === 'review' && (
                  <>
                    <section className="bg-white rounded-2xl border border-slate-200 p-8">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-slate-900">User Information</h3>
                        <span className="text-slate-500 text-sm">Secure</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs text-slate-500">FULL NAME</label>
                          <input
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"
                            type="text"
                            value={user?.name || ''}
                            readOnly
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-slate-500">EMAIL ADDRESS</label>
                          <input
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"
                            type="email"
                            value={user?.email || ''}
                            readOnly
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs text-slate-500">PHONE NUMBER</label>
                          <input
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"
                            type="tel"
                            value={user?.phone || ''}
                            readOnly
                          />
                        </div>
                      </div>
                    </section>

                    <section className="bg-slate-100 rounded-2xl p-6 border border-slate-200">
                      <label className="flex items-start gap-4 cursor-pointer">
                        <input
                          className="mt-1 w-5 h-5 text-orange-600 border-slate-300 rounded"
                          type="checkbox"
                          defaultChecked
                        />
                        <span className="text-slate-700">
                          I agree to the Terms of Service and the Cancellation Policy. I understand
                          that cancellations made less than 24 hours in advance may be subject to a
                          fee.
                        </span>
                      </label>
                    </section>
                  </>
                )}

                {step === 'payment' && (
                  <section ref={paymentSectionRef} className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-8">
                      <h3 className="mb-4 text-xl font-semibold text-slate-900">Payment Method</h3>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <button className="rounded-xl border-2 border-orange-300 bg-orange-50 p-4 text-left">
                          <p className="text-sm font-semibold text-orange-700">Card</p>
                          <p className="text-xs text-orange-600">Credit / Debit</p>
                        </button>
                        <button className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-slate-500">
                          Apple Pay
                        </button>
                        <button className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-slate-500">
                          Google Pay
                        </button>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-8">
                      <h3 className="text-xl font-semibold text-slate-900 mb-6">Card Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-sm text-slate-700 mb-2">
                            Cardholder Name
                          </label>
                          <input
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            placeholder="JANE DOE"
                            type="text"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm text-slate-700 mb-2">Card Number</label>
                          <input
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            placeholder="0000 0000 0000 0000"
                            type="text"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-700 mb-2">Expiry Date</label>
                          <input
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3"
                            value={expiry}
                            onChange={(e) => setExpiry(e.target.value)}
                            placeholder="MM/YY"
                            type="text"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-700 mb-2">CVV</label>
                          <input
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3"
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value)}
                            placeholder="123"
                            type="text"
                          />
                        </div>
                      </div>

                      <button
                        className="w-full mt-8 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 rounded-lg transition-colors flex justify-center items-center gap-2"
                        disabled={isExpired || confirmPayment.isPending}
                        onClick={handleCompletePayment}
                      >
                        <Lock className="h-4 w-4" />
                        {confirmPayment.isPending ? 'Processing...' : 'Complete Payment'}
                      </button>
                    </div>
                  </section>
                )}
              </div>

              <div className="col-span-12 lg:col-span-4">
                <div className="sticky top-24 space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-8">
                    <h3 className="text-xl font-semibold text-slate-900 mb-6">Payment Summary</h3>
                    <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
                      <p className="font-semibold text-slate-900">{booking.court?.name}</p>
                      <p className="mt-1 text-slate-600">
                        {format(new Date(booking.startTime), 'dd/MM/yyyy')} •{' '}
                        {format(new Date(booking.startTime), 'HH:mm')} -{' '}
                        {format(new Date(booking.endTime), 'HH:mm')}
                      </p>
                    </div>
                    <div className="space-y-4 mb-8 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Base Amount</span>
                        <span className="text-slate-900 font-semibold">
                          {(booking.totalPrice || 0).toLocaleString()} d
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Service Fee</span>
                        <span className="text-slate-900 font-semibold">0 d</span>
                      </div>
                      <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-slate-900 font-semibold">Total Amount</span>
                        <span className="text-orange-600 font-bold">
                          {(booking.totalPrice || 0).toLocaleString()} d
                        </span>
                      </div>
                    </div>

                    {step === 'review' && (
                      <button
                        className="w-full bg-orange-600 text-white py-4 px-6 rounded-lg font-semibold flex items-center justify-center gap-3 hover:bg-orange-500 transition-all"
                        disabled={isExpired}
                        onClick={() => {
                          setStep('payment');
                          requestAnimationFrame(() => {
                            paymentSectionRef.current?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            });
                          });
                        }}
                      >
                        Proceed to Payment
                      </button>
                    )}

                    {step === 'payment' && (
                      <button
                        className="w-full bg-orange-600 text-white py-4 px-6 rounded-lg font-semibold flex items-center justify-center gap-3 hover:bg-orange-500 transition-all"
                        disabled={isExpired || confirmPayment.isPending}
                        onClick={handleCompletePayment}
                      >
                        <Lock className="h-4 w-4" />
                        {confirmPayment.isPending ? 'Processing...' : 'Complete Payment'}
                      </button>
                    )}

                    {step === 'payment' && booking.paymentDeadline && !isExpired && (
                      <div className="mt-6 flex items-center justify-center">
                        <CountdownTimer
                          deadline={booking.paymentDeadline}
                          onExpire={() => setLocalExpired(true)}
                        />
                      </div>
                    )}

                    {isExpired && (
                      <p className="mt-6 rounded-lg bg-red-50 p-3 text-red-700 text-sm">
                        Booking expired. Please create a new booking.
                      </p>
                    )}
                    {!isExpired && booking.status === BookingStatus.PENDING_PAYMENT && (
                      <p className="mt-6 rounded-lg bg-amber-50 p-3 text-amber-700 text-sm">
                        Status remains pending until you complete payment.
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden">
                    <div className="relative z-10">
                      <h4 className="text-orange-200 text-sm font-semibold mb-2">PRO TIP</h4>
                      <p className="text-sm text-white/80 leading-relaxed">
                        Booking for a league team? Switch to a Team Account to manage rosters and
                        split payments automatically.
                      </p>
                    </div>
                    <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full border border-white/20 opacity-20" />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
