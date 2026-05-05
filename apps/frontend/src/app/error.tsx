'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-destructive">Đã xảy ra lỗi</h1>
          <p className="text-muted-foreground">
            {error.message || 'Có lỗi xảy ra khi xử lý yêu cầu của bạn.'}
          </p>
          {error.digest && <p className="text-xs text-muted-foreground">Mã lỗi: {error.digest}</p>}
        </div>

        <div className="flex gap-4 justify-center">
          <Button onClick={reset} size="lg">
            Thử lại
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="/">Về trang chủ</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
