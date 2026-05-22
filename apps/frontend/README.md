# Frontend Application

This package contains the Next.js 16 frontend for the Court Booking platform.

## Responsibilities

The frontend is responsible for:

- rendering the public marketing and discovery experience
- handling login, register, profile, bookings, and checkout flows
- providing the full admin dashboard UI
- consuming the backend API through Axios and TanStack Query
- managing lightweight client auth state through Zustand
- exposing SEO metadata, sitemap, robots, and manifest for public pages

## Tech Stack

| Area          | Stack                   |
| ------------- | ----------------------- |
| Framework     | Next.js 16 App Router   |
| UI Runtime    | React 19                |
| Language      | TypeScript              |
| Data Fetching | TanStack Query          |
| State         | Zustand                 |
| Styling       | Tailwind CSS            |
| Forms         | React Hook Form, Zod    |
| HTTP Client   | Axios                   |
| Testing       | Vitest, Testing Library |

## Directory Structure

```text
apps/frontend/
├── public/                     Brand assets and static files
├── src/
│   ├── app/                    App Router routes, layouts, metadata routes
│   ├── components/             UI, admin, booking, court, and shared components
│   ├── hooks/                  Data hooks built on TanStack Query
│   ├── lib/                    API client, auth store, SEO helpers, utility modules
│   ├── providers/              Query provider
│   └── types/                  Frontend-facing types
├── Dockerfile
├── next.config.js
├── package.json
└── vitest.config.js
```

## Route Structure

### Public Routes

- `/`
- `/courts`
- `/courts/[id]`
- `/login`
- `/register`

### Authenticated User Routes

- `/bookings`
- `/profile`
- `/checkout/[bookingId]`

### Admin Routes

- `/admin`
- `/admin/bookings`
- `/admin/bookings/new`
- `/admin/courts`
- `/admin/courts/[id]/edit`
- `/admin/courts/[id]/time-slots`
- `/admin/customers`
- `/admin/features`
- `/admin/revenue`
- `/admin/settings`
- `/admin/slot-templates`
- `/admin/sport-types`
- `/admin/stats`

## Installation and Run

From the repository root:

```bash
pnpm install
pnpm --filter @court-booking/frontend dev
```

Default local URL:

- `http://localhost:3000`

### Production Build

```bash
pnpm --filter @court-booking/frontend build
pnpm --filter @court-booking/frontend start
```

### Docker

The frontend image is built through:

- [`Dockerfile`](Dockerfile)

In Docker, the main entrypoint for users is typically:

- `http://localhost`

through the Nginx reverse proxy.

## Environment Variables

Frontend-specific runtime variables:

| Variable               | Required | Purpose                                             |
| ---------------------- | -------- | --------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | Yes      | Browser-facing API origin                           |
| `NEXT_PUBLIC_SITE_URL` | Yes      | Public site origin for canonical and SEO metadata   |
| `NEXTAUTH_URL`         | Optional | Reserved for optional Auth.js/NextAuth integrations |
| `NEXTAUTH_SECRET`      | Optional | Reserved for optional Auth.js/NextAuth integrations |

In local development, frontend-specific values usually live in:

- `.env.local`
- or the repo root `.env` / `.env.docker`, depending on how the app is started

## Frontend Architecture

### App Router Layout

- `src/app/layout.tsx` defines global metadata and providers.
- `src/app/(dashboard)/layout.tsx` wraps the authenticated and dashboard UI shell.
- `src/app/(dashboard)/admin/layout.tsx` applies admin-specific shell and noindex rules.

### Data Layer

- Axios is configured in [`src/lib/api.ts`](src/lib/api.ts)
- Queries and mutations are wrapped in reusable hooks under `src/hooks/`
- Query keys are centralized inside the API layer

### Authentication Model

- user identity is stored in a Zustand store
- refresh/access behavior is handled through the Axios interceptor
- auth tokens remain in httpOnly cookies
- public routes no longer probe `/auth/me` unnecessarily for anonymous visitors

### SEO and Metadata

The frontend provides:

- route-level metadata for public pages
- `robots.txt`
- `sitemap.xml`
- `manifest.webmanifest`
- venue-specific metadata for `/courts/[id]`
- Open Graph and Twitter metadata

### Media Handling

- uploaded court images are normalized through a frontend helper before rendering
- local upload URLs bypass the Next image optimizer when appropriate
- remote public image domains are configured in `next.config.js`

## Feature Map

### Public UX

- home page
- court listing
- court detail pages
- SEO metadata and structured data

### User UX

- registration and login
- profile management and avatar upload
- booking creation and payment confirmation
- booking history and status sections
- notification bell and unread count

### Admin UX

- catalog management for courts, features, and sport types
- slot template management
- booking operations and analytics views
- revenue and settings pages

## API Integration

The frontend relies on the backend endpoints exposed under:

- `/api/v1/auth`
- `/api/v1/users`
- `/api/v1/courts`
- `/api/v1/bookings`
- `/api/v1/admin/bookings`
- `/api/v1/features`
- `/api/v1/sport-types`
- `/api/v1/notifications`
- `/api/v1/settings/runtime`
- `/api/v1/admin/settings`

## Testing

### Build Verification

```bash
pnpm --filter @court-booking/frontend build
```

### Vitest

```bash
pnpm --filter @court-booking/frontend test
```

## Troubleshooting

### Uploaded Images Do Not Render

Check:

- Nginx routing for `/uploads/`
- backend upload path generation
- frontend image normalization helper

### Docker Frontend Build Issues

The frontend uses runtime-friendly sitemap generation so that Docker image builds do not require a live backend during image build time.

If the image still fails, re-check:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SITE_URL`
- Docker build args in the compose file
