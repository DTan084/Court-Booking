import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Try to get token from cookie first (for future cookie-based auth)
  let token = request.cookies.get('access_token')?.value;

  // If no cookie, check Authorization header (for current localStorage-based auth)
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // Define route types
  const isAdminRoute = pathname.startsWith('/admin');
  const isAuthRoute = pathname === '/login' || pathname === '/register';
  const isPublicRoute = pathname === '/' || pathname.startsWith('/courts');
  const isProtected = pathname.startsWith('/bookings') || pathname.startsWith('/admin');

  // Allow public routes without authentication
  if (isPublicRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users from protected routes
  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin route protection dựa trên role trong JWT payload
  if (isAdminRoute && token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirect authenticated users from auth routes
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/bookings/:path*', '/admin/:path*', '/login', '/register'],
};
