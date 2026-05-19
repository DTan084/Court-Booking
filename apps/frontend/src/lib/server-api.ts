import type { Court, PaginatedResult } from '@/types';
import { getApiOriginForServer } from './site';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
};

async function fetchCourtsPageForSeo(page: number, limit: number): Promise<PaginatedResult<Court>> {
  const response = await fetch(
    `${getApiOriginForServer()}/api/v1/courts?page=${page}&limit=${limit}`,
    {
      next: { revalidate: 300 },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch courts for SEO: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as ApiEnvelope<PaginatedResult<Court>>;
  return payload.data;
}

export async function fetchCourtsForSeo(limit = 50): Promise<Court[]> {
  const firstPage = await fetchCourtsPageForSeo(1, limit);
  const courts = [...(firstPage.data ?? [])];

  for (let page = 2; page <= firstPage.meta.totalPages; page += 1) {
    const nextPage = await fetchCourtsPageForSeo(page, limit);
    courts.push(...(nextPage.data ?? []));
  }

  return courts;
}

export async function fetchCourtForSeo(id: string): Promise<Court | null> {
  try {
    const response = await fetch(`${getApiOriginForServer()}/api/v1/courts/${id}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as ApiEnvelope<Court>;
    return payload.data ?? null;
  } catch {
    return null;
  }
}
