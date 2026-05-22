import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CourtDetailPageClient from './court-detail-page-client';
import { fetchCourtForSeo } from '@/lib/server-api';
import { getAbsoluteImageUrl, getAbsoluteUrl, SITE_NAME, SITE_DESCRIPTION } from '@/lib/site';
import { CourtStatus } from '@/types';

type CourtDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function cleanText(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized.replace(/\s+/g, ' ') : null;
}

function buildVenueTitle(
  name: string,
  district?: string | null,
  sportTypeName?: string | null,
): string {
  const cleanDistrict = cleanText(district);
  const cleanSportTypeName = cleanText(sportTypeName)?.toLowerCase();

  if (cleanDistrict && cleanSportTypeName) {
    return `${name} | Book a ${cleanSportTypeName} court in ${cleanDistrict}`;
  }

  if (cleanDistrict) {
    return `${name} | Book a court in ${cleanDistrict}`;
  }

  if (cleanSportTypeName) {
    return `${name} | Book a ${cleanSportTypeName} court`;
  }

  return `${name} | Book this venue`;
}

function buildVenueDescription(court: {
  name: string;
  district?: string | null;
  address: string;
  description?: string | null;
  sportTypeName?: string | null;
}): string {
  const customDescription = cleanText(court.description);
  if (customDescription) {
    return customDescription;
  }

  const cleanDistrict = cleanText(court.district);
  const cleanAddress = cleanText(court.address);
  const cleanSportTypeName = cleanText(court.sportTypeName)?.toLowerCase();
  const sportLabel = cleanSportTypeName ? `${cleanSportTypeName} court` : 'court';

  if (cleanDistrict && cleanAddress) {
    return `Book ${court.name}, a ${sportLabel} in ${cleanDistrict}, at ${cleanAddress}. Check live availability, hourly pricing, and reserve your next session online.`;
  }

  if (cleanDistrict) {
    return `Book ${court.name}, a ${sportLabel} in ${cleanDistrict}, with live availability, clear hourly pricing, and fast online checkout.`;
  }

  return `Book ${court.name}, a ${sportLabel} at ${cleanAddress || 'this venue'}, with clear hourly pricing, live availability, and fast online checkout.`;
}

export async function generateMetadata({ params }: CourtDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const court = await fetchCourtForSeo(id);

  if (!court) {
    return {
      title: 'Venue Not Available',
      description: SITE_DESCRIPTION,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = buildVenueTitle(court.name, court.district, court.sportTypeName);
  const description = buildVenueDescription(court);
  const image = getAbsoluteImageUrl(court.images?.[0]?.url);

  return {
    title,
    description,
    alternates: {
      canonical: getAbsoluteUrl(`/courts/${court.id}`),
    },
    openGraph: {
      title: `${court.name} | ${SITE_NAME}`,
      description,
      url: getAbsoluteUrl(`/courts/${court.id}`),
      type: 'website',
      images: image
        ? [
            {
              url: image,
              alt: court.name,
            },
          ]
        : undefined,
    },
    twitter: {
      title: `${court.name} | ${SITE_NAME}`,
      description,
      images: image ? [image] : undefined,
    },
    robots:
      court.status === CourtStatus.INACTIVE || court.deletedAt
        ? {
            index: false,
            follow: true,
          }
        : undefined,
  };
}

export default async function CourtDetailPage({ params }: CourtDetailPageProps) {
  const { id } = await params;
  const court = await fetchCourtForSeo(id);

  if (!court) {
    notFound();
  }

  const primaryImage = getAbsoluteImageUrl(court.images?.[0]?.url);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: court.name,
    description: buildVenueDescription(court),
    url: getAbsoluteUrl(`/courts/${court.id}`),
    image: primaryImage ? [primaryImage] : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: court.address,
      addressLocality: court.district || undefined,
    },
    offers: {
      '@type': 'Offer',
      price: court.pricePerHour,
      priceCurrency: 'VND',
      availability:
        court.status === CourtStatus.ACTIVE && !court.deletedAt
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CourtDetailPageClient params={{ id }} />
    </>
  );
}
