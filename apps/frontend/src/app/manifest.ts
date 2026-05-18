import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f8f9ff',
    theme_color: '#0b1c30',
    icons: [
      {
        src: '/logo-mark.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['sports', 'lifestyle', 'business'],
    orientation: 'portrait',
    dir: 'ltr',
    lang: 'en',
  };
}
