'use client';

import { useEffect } from 'react';
import Link from 'next/link';
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
          <h1 className="text-4xl font-bold text-destructive">Something went wrong</h1>
          <p className="text-muted-foreground">
            {error.message || 'An error occurred while processing your request.'}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground">Error Digest: {error.digest}</p>
          )}
        </div>

        <div className="flex gap-4 justify-center">
          <Button onClick={reset} size="lg">
            Try Again
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/">Go to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
