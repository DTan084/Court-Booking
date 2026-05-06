import { cookies } from 'next/headers';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  // Check if user is logged in by checking for JWT cookie
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;
  const isLoggedIn = !!token;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Đặt sân thể thao dễ dàng
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Tìm kiếm, đặt lịch và quản lý booking của bạn tại một nơi
            </p>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button asChild size="lg" className="text-lg px-8">
                <Link href="/courts">Khám phá sân</Link>
              </Button>

              {!isLoggedIn && (
                <Button asChild variant="outline" size="lg" className="text-lg px-8">
                  <Link href="/login">Đăng nhập</Link>
                </Button>
              )}

              {isLoggedIn && (
                <Button asChild variant="outline" size="lg" className="text-lg px-8">
                  <Link href="/courts">Xem danh sách sân</Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto grid gap-8 md:grid-cols-3">
              <div className="text-center space-y-3">
                <div className="text-4xl">🔍</div>
                <h3 className="text-xl font-semibold">Tìm kiếm dễ dàng</h3>
                <p className="text-muted-foreground">
                  Tìm sân phù hợp với loại thể thao và địa điểm bạn muốn
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="text-4xl">📅</div>
                <h3 className="text-xl font-semibold">Đặt lịch nhanh chóng</h3>
                <p className="text-muted-foreground">
                  Chọn khung giờ phù hợp và xác nhận booking chỉ trong vài bước
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="text-4xl">📋</div>
                <h3 className="text-xl font-semibold">Quản lý booking</h3>
                <p className="text-muted-foreground">
                  Theo dõi và quản lý tất cả các booking của bạn tại một nơi
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Court Booking. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
