import Link from 'next/link';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { SiteFooter } from '@/components/shared/SiteFooter';
import { Button } from '@/components/ui/button';
import { SportType, type Court, type PaginatedResult } from '@/types';

type CourtsApiResponse = {
  success: boolean;
  data: PaginatedResult<Court>;
};

const sportTagByType: Record<SportType, string> = {
  [SportType.BADMINTON]: 'High Tempo',
  [SportType.TENNIS]: 'Pro Standard',
  [SportType.FOOTBALL]: 'Stadium Class',
  [SportType.BASKETBALL]: 'Elite Performance',
  [SportType.VOLLEYBALL]: 'Tournament Ready',
};

const sportImageByType: Record<SportType, string> = {
  [SportType.TENNIS]:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD-qmqGzKTb_fQ97SOjBL8Oxqt3waSI2Mn6C8JOlYoDBy-koBdKOQ-ghYFErIxUJURWyWxbJaZe1X81uxZHw99xJblal_JavfzwtGBWd6eOW3A_s3CdBMz-B5e2nd93RFFMoEnfUF2syDDTaDiXO4KfRsvg7BBjogi1YkZIaRMVsJUWIDRpUaTo75Ipzq6Y-F3XsOGPW4gmwNUVQY2XypA4LRc0enaRMZqo5SMEZF50jkLqUpBA640-nskj4P_zWMFXuyF7dA4nFg',
  [SportType.BADMINTON]:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB0cEbdg1BQGGHPg_G_8H3XHu8ZKf6TLVOCv6T45AprIOKTw3QVUtvIbMSuM9VB3ifPZxyIS-NuRPw4d_d8Rs7XbbZf05MC1GqgW8a5NMvGNQm6qMjEYtkFDcWUjKZp6PAfcIFfLZ6RdGJ7aSW1DhL-mVFNZeTrtinifPDw1Rg4w4XpgfwKEduhI7KgertOD_XggSUmwWysBtUeWcInZ45-j2YcUDpMl3HuHg2Nj4CmfnVNQv24gZeybyY4ZXvT43H40FOaWg4UZg',
  [SportType.BASKETBALL]:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDbQe9JDs9gGcigP92Uh2_RrumHv95bdlTnEGY17MbTczs4i1gWf8PPVcgwyxF7MDsd7LGI3gGxPbvsD9G9I90KtfPMIS3BUng9jgQN_KPIJT9xdoCxs1Ltq6808YuvB5insquUyDkMCt3-i5xYg9RoCv8dogpKbWGci-nnoabhGkw5fgMX_khHccGmszpINxO2JZhLwIlZGJNjabwRO_xpcQ7gUMY1Sjo62KWSDzyeTfPxX58K_wSeBizCv8FvjFwwIZXWTFE5DA',
  [SportType.FOOTBALL]:
    'https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1400&q=80',
  [SportType.VOLLEYBALL]:
    'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1400&q=80',
};

async function getFeaturedCourts() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) return [] as Court[];

  try {
    const res = await fetch(`${apiUrl}/api/v1/courts?page=1&limit=6`, {
      cache: 'no-store',
    });

    if (!res.ok) return [] as Court[];

    const json = (await res.json()) as CourtsApiResponse;
    const all = json?.data?.data ?? [];
    return all.filter((court) => court.status === 'ACTIVE').slice(0, 3);
  } catch {
    return [] as Court[];
  }
}

export default async function HomePage() {
  const courts = await getFeaturedCourts();

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      <Navbar />

      <main>
        <section className="relative h-[80vh] min-h-[680px] overflow-hidden bg-[#0e2034]">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAnMPRMm4UOHY1uKc2FiXwc_APn4xn1T8z2ACbQ5ePgMLiz-UXD3pCUzS0euhK6se5354dbvarAlXa8gYXjdXXZ2TIR1wAiIDkDrbZhpVSWlSxLL9J8hhUlfhg7BGE74i4atF3CbcQjJV75x3e5e9A6ESWsNqbtmrYyJw-R6E1AWAMNt7J-4LKKz0wY2cFP8HLSIoY5PBAtHisM1mvwjyJTBCktsj4v2pJcXO6jiemi_6PMy02vcayco_FhIaPHMrnUYTxYcdUAA"
            alt="Indoor court"
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#131b2e] via-[#131b2eba] to-transparent" />
          <div className="relative z-10 mx-auto flex h-full w-full max-w-[1440px] items-center px-5 md:px-8">
            <div className="max-w-2xl">
              <span className="mb-6 inline-block rounded-full border border-[#fd933d] bg-[#fd933d] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#301400]">
                Digital Command Center
              </span>
              <h1 className="mb-6 text-5xl font-black leading-tight tracking-tight text-white md:text-7xl">
                Command the Court.
                <span className="block text-[#fd933d]">Elevate Your Game.</span>
              </h1>
              <p className="mb-10 max-w-xl text-lg leading-relaxed text-slate-200">
                Elite management for professional facilities. Schedule matches, manage memberships,
                and track performance with the industry&apos;s fastest interface.
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
              ['15+', 'Premier Locations'],
              ['99.9%', 'Uptime Reliability'],
              ['4.9/5', 'Member Rating'],
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
                Danh sách này lấy trực tiếp từ dữ liệu sân trong hệ thống.
              </p>
            </div>
            <Link
              href="/courts"
              className="inline-flex items-center gap-2 font-medium text-[#944a00] hover:underline"
            >
              View All Facilities <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {courts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
              Chưa có dữ liệu sân để hiển thị.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {courts.map((court) => (
                <article
                  key={court.id}
                  className="group relative aspect-[4/5] overflow-hidden rounded-xl"
                >
                  <img
                    src={sportImageByType[court.sportType]}
                    alt={court.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 p-6">
                    <span className="rounded bg-[#fd933d] px-2 py-1 text-[10px] font-bold uppercase text-[#301400]">
                      {sportTagByType[court.sportType]}
                    </span>
                    <h3 className="mt-3 text-2xl font-bold text-white">{court.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-300">{court.address}</p>
                  </div>
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
