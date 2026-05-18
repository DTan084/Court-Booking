import type { MetadataRoute } from 'next';
import { getAbsoluteUrl, getSiteOrigin } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/admin/', '/bookings', '/checkout/', '/login', '/profile', '/register'],
      },
    ],
    sitemap: getAbsoluteUrl('/sitemap.xml'),
    host: getSiteOrigin(),
  };
}
