import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-3xl font-semibold tracking-tight">Trang không tồn tại</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Xin lỗi, chúng tôi không thể tìm thấy trang bạn đang tìm kiếm. Vui lòng kiểm tra lại
            đường dẫn hoặc quay về trang chủ.
          </p>
        </div>

        <Button asChild size="lg">
          <Link href="/courts">Về trang chủ</Link>
        </Button>
      </div>
    </div>
  );
}
