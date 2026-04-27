// TODO: Next.js Middleware
// - Auth guard trên Edge Runtime
// - Đọc JWT từ cookie/header
// - Redirect về /login nếu không có token

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // TODO: Check authentication
  // TODO: Protect dashboard routes
  return NextResponse.next();
}

export const config = {
  matcher: ['/(dashboard)/:path*'],
};
