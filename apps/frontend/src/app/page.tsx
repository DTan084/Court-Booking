import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { SiteFooter } from '@/components/shared/SiteFooter';
import { Button } from '@/components/ui/button';
import { normalizeImageUrl, shouldBypassImageOptimizer } from '@/lib/image';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, getAbsoluteUrl } from '@/lib/site';
import { CourtStatus } from '@court-booking/shared';
import { type Court, type PaginatedResult } from '@/types';

type CourtsApiResponse = {
  success: boolean;
  data: PaginatedResult<Court>;
};

type SportTypeItem = {
  id: string;
  name: string;
};

const sportImageByName: Record<string, string> = {
  tennis:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD-qmqGzKTb_fQ97SOjBL8Oxqt3waSI2Mn6C8JOlYoDBy-koBdKOQ-ghYFErIxUJURWyWxbJaZe1X81uxZHw99xJblal_JavfzwtGBWd6eOW3A_s3CdBMz-B5e2nd93RFFMoEnfUF2syDDTaDiXO4KfRsvg7BBjogi1YkZIaRMVsJUWIDRpUaTo75Ipzq6Y-F3XsOGPW4gmwNUVQY2XypA4LRc0enaRMZqo5SMEZF50jkLqUpBA640-nskj4P_zWMFXuyF7dA4nFg',
  badminton:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB0cEbdg1BQGGHPg_G_8H3XHu8ZKf6TLVOCv6T45AprIOKTw3QVUtvIbMSuM9VB3ifPZxyIS-NuRPw4d_d8Rs7XbbZf05MC1GqgW8a5NMvGNQm6qMjEYtkFDcWUjKZp6PAfcIFfLZ6RdGJ7aSW1DhL-mVFNZeTrtinifPDw1Rg4w4XpgfwKEduhI7KgertOD_XggSUmwWysBtUeWcInZ45-j2YcUDpMl3HuHg2Nj4CmfnVNQv24gZeybyY4ZXvT43H40FOaWg4UZg',
  basketball:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDbQe9JDs9gGcigP92Uh2_RrumHv95bdlTnEGY17MbTczs4i1gWf8PPVcgwyxF7MDsd7LGI3gGxPbvsD9G9I90KtfPMIS3BUng9jgQN_KPIJT9xdoCxs1Ltq6808YuvB5insquUyDkMCt3-i5xYg9RoCv8dogpKbWGci-nnoabhGkw5fgMX_khHccGmszpINxO2JZhLwIlZGJNjabwRO_xpcQ7gUMY1Sjo62KWSDzyeTfPxX58K_wSeBizCv8FvjFwwIZXWTFE5DA',
  football:
    'https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1400&q=80',
  volleyball:
    'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1400&q=80',
};

export const metadata: Metadata = {
  title: 'Book Tennis, Badminton, and Basketball Courts Online',
  description:
    'Book tennis, badminton, basketball, and multi-sport courts online with clear pricing, real-time availability, and fast checkout.',
  alternates: {
    canonical: getAbsoluteUrl('/'),
  },
  openGraph: {
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description:
      'Discover premium sports venues, compare pricing, and reserve your next court session online in minutes.',
    url: getAbsoluteUrl('/'),
  },
  twitter: {
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description:
      'Find and reserve sports courts online with real-time availability and straightforward booking.',
  },
};

async function getFeaturedCourts() {
  const apiUrl =
    typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_API_URL === 'http://localhost'
        ? 'http://backend:3001'
        : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      : process.env.NEXT_PUBLIC_API_URL || 'http://localhost';
  try {
    const res = await fetch(`${apiUrl}/api/v1/courts?page=1&limit=6`, { cache: 'no-store' });
    if (!res.ok) return [] as Court[];
    const json = (await res.json()) as CourtsApiResponse;
    const all = json?.data?.data ?? [];
    return all.filter((court) => court.status === CourtStatus.ACTIVE).slice(0, 3);
  } catch {
    return [] as Court[];
  }
}

async function getSportTypes() {
  const apiUrl =
    typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_API_URL === 'http://localhost'
        ? 'http://backend:3001'
        : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      : process.env.NEXT_PUBLIC_API_URL || 'http://localhost';
  try {
    const res = await fetch(`${apiUrl}/api/v1/sport-types`, { cache: 'no-store' });
    if (!res.ok) return [] as SportTypeItem[];
    const json = (await res.json()) as { success: boolean; data: SportTypeItem[] };
    return json?.data ?? [];
  } catch {
    return [] as SportTypeItem[];
  }
}

export default async function HomePage() {
  const [courts, sportTypes] = await Promise.all([getFeaturedCourts(), getSportTypes()]);
  const sportTypeMap = new Map(sportTypes.map((item) => [item.id, item]));
  const featuredCourts = courts.filter((court) => court.isFeatured);
  const nonFeaturedCourts = courts.filter((court) => !court.isFeatured);
  const priorityCourts = [...featuredCourts, ...nonFeaturedCourts].slice(0, 3);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: getAbsoluteUrl('/'),
    description: SITE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${getAbsoluteUrl('/courts')}?name={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main>
        <section className="relative h-[80vh] min-h-[680px] overflow-hidden bg-[#0e2034]">
          <Image
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAnMPRMm4UOHY1uKc2FiXwc_APn4xn1T8z2ACbQ5ePgMLiz-UXD3pCUzS0euhK6se5354dbvarAlXa8gYXjdXXZ2TIR1wAiIDkDrbZhpVSWlSxLL9J8hhUlfhg7BGE74i4atF3CbcQjJV75x3e5e9A6ESWsNqbtmrYyJw-R6E1AWAMNt7J-4LKKz0wY2cFP8HLSIoY5PBAtHisM1mvwjyJTBCktsj4v2pJcXO6jiemi_6PMy02vcayco_FhIaPHMrnUYTxYcdUAA"
            alt="Indoor court"
            fill
            sizes="100vw"
            className="object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#131b2e] via-[#131b2eba] to-transparent" />
          <div className="relative z-10 mx-auto flex h-full w-full max-w-[1440px] items-center px-5 md:px-8">
            <div className="max-w-2xl">
              <span className="mb-6 inline-block rounded-full border border-[#fd933d] bg-[#fd933d] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#301400]">
                Online Court Booking
              </span>
              <h1 className="mb-6 text-5xl font-black leading-tight tracking-tight text-white md:text-7xl">
                Book Better Courts.
                <span className="block text-[#fd933d]">Play Without the Back-and-Forth.</span>
              </h1>
              <p className="mb-10 max-w-xl text-lg leading-relaxed text-slate-200">
                Browse tennis, badminton, basketball, and multi-sport venues with live availability,
                transparent hourly pricing, and a checkout flow that takes minutes instead of
                messages.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#944a00] px-8 text-white hover:bg-[#7f3f00]"
                >
                  <Link href="/courts">Book Now</Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/40 bg-white/5 px-8 text-white hover:bg-white/10"
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  View Demo
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section className="border-y border-slate-300 bg-[#eff4ff] py-14">
          <div className="mx-auto grid w-full max-w-[1440px] grid-cols-2 gap-8 px-5 text-center md:grid-cols-4 md:px-8">
            {[
              ['50k+', 'Monthly Bookings'],
              ['15+', 'Bookable Venues'],
              ['99.9%', 'Platform Availability'],
              ['4.9/5', 'Player Rating'],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-5xl font-black tracking-tight text-black">{value}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="mx-auto w-full max-w-[1440px] px-5 py-16 md:px-8">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="text-4xl font-extrabold text-black">World-Class Facilities</h2>
              <p className="mt-3 max-w-2xl text-slate-600">
                Compare featured sports courts, check what fits your group size and budget, and move
                straight into booking.
              </p>
            </div>
            <Link
              href="/courts"
              className="inline-flex items-center gap-2 font-medium text-[#944a00] hover:underline"
            >
              Browse All Courts <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {priorityCourts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
              No court data available to display.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {priorityCourts.map((court) => (
                <article
                  key={court.id}
                  className="group relative aspect-[4/5] overflow-hidden rounded-xl"
                >
                  <Link
                    href={`/courts/${court.id}`}
                    aria-label={`View details of ${court.name}`}
                    className="block h-full w-full"
                  >
                    {(() => {
                      const dbImageSrc = court.images?.[0]?.url;
                      const normalizedDbImageSrc = normalizeImageUrl(dbImageSrc);
                      const sport = sportTypeMap.get(court.sportTypeId);
                      const sportName = sport?.name?.toLowerCase() ?? '';
                      const sportFallback = sportName ? sportImageByName[sportName] : undefined;
                      return (
                        <Image
                          src={
                            normalizedDbImageSrc ??
                            sportFallback ??
                            'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1400&q=80'
                          }
                          alt={court.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          unoptimized={shouldBypassImageOptimizer(dbImageSrc)}
                          className="object-cover transition duration-500 group-hover:scale-110"
                        />
                      );
                    })()}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 p-6">
                      <div className="flex items-center gap-2">
                        {court.isFeatured && (
                          <span className="rounded bg-[#fd933d] px-2 py-1 text-[10px] font-bold uppercase text-[#301400]">
                            Featured
                          </span>
                        )}
                        <span className="rounded bg-[#fd933d] px-2 py-1 text-[10px] font-bold uppercase text-[#301400]">
                          {sportTypeMap.get(court.sportTypeId)?.name ?? 'Court'}
                        </span>
                      </div>
                      <h3 className="mt-3 text-2xl font-bold text-white">{court.name}</h3>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-300">
                        {court.description?.trim() || court.address}
                      </p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
