import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-3xl font-semibold tracking-tight">Page Not Found</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Sorry, we could not find the page you are looking for. Please check the URL again or
            return to the home page.
          </p>
        </div>

        <Button asChild size="lg">
          <Link href="/">Go to Home</Link>
        </Button>
      </div>
    </div>
  );
}
