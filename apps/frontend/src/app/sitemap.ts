import type { MetadataRoute } from 'next';
import { fetchCourtsForSeo } from '@/lib/server-api';
import { getAbsoluteUrl } from '@/lib/site';
import { CourtStatus } from '@/types';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: getAbsoluteUrl('/'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: getAbsoluteUrl('/courts'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  let courts: Awaited<ReturnType<typeof fetchCourtsForSeo>>;
  try {
    courts = await fetchCourtsForSeo();
  } catch (error) {
    throw new Error(
      `Unable to generate court detail URLs for sitemap.xml: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
  }

  const courtRoutes: MetadataRoute.Sitemap = courts
    .filter((court) => court.status === CourtStatus.ACTIVE && !court.deletedAt)
    .map((court) => ({
      url: getAbsoluteUrl(`/courts/${court.id}`),
      lastModified: new Date(court.updatedAt),
      changeFrequency: 'daily',
      priority: 0.8,
    }));

  return [...staticRoutes, ...courtRoutes];
}
