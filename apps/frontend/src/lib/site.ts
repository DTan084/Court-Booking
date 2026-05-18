export const SITE_NAME = 'Tana';
export const SITE_TAGLINE = 'Book premium sports courts without the phone calls.';
export const SITE_DESCRIPTION =
  'Discover and book tennis, badminton, basketball, and multi-sport courts with live availability, clear pricing, and fast checkout.';

function normalizeOrigin(origin?: string | null): string {
  if (!origin) return 'http://localhost:3000';
  return /^https?:\/\//i.test(origin) ? origin : `https://${origin}`;
}

export function getSiteOrigin(): string {
  return normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL);
}

export function getApiOriginForServer(): string {
  if (process.env.NEXT_PUBLIC_API_URL === 'http://localhost') {
    return 'http://backend:3001';
  }

  return normalizeOrigin(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
}

export function getAbsoluteUrl(path = '/'): string {
  return new URL(path, getSiteOrigin()).toString();
}

export function getAbsoluteImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return new URL(url, getSiteOrigin()).toString();
}
