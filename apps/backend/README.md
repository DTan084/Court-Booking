# Backend Service

This package contains the NestJS API for the Court Booking platform.

## Responsibilities

The backend is responsible for:

- authentication, refresh, logout, and role checks
- court, feature, sport type, and slot template management
- booking lifecycle rules and admin booking operations
- notifications, runtime settings, and health checks
- background jobs for expiry, completion, and reminders
- Redis-backed caching, throttling, and queue infrastructure

## Tech Stack

| Area          | Stack           |
| ------------- | --------------- |
| Framework     | NestJS 11       |
| ORM           | TypeORM 0.3     |
| Database      | PostgreSQL 17   |
| Queue         | Bull            |
| Cache / Infra | Redis, ioredis  |
| Auth          | JWT, Passport   |
| Docs          | Swagger         |
| Testing       | Jest, Supertest |

## Directory Structure

```text
apps/backend/
├── src/
│   ├── common/               Shared filters, interceptors, decorators, Redis wiring
│   ├── config/               App, database, JWT, Redis, booking configuration
│   ├── database/
│   │   ├── entities/
│   │   ├── migrations/
│   │   └── seed.ts
│   └── modules/
│       ├── auth/
│       ├── bookings/
│       ├── courts/
│       ├── features/
│       ├── health/
│       ├── notifications/
│       ├── settings/
│       ├── slot-templates/
│       ├── sport-types/
│       └── users/
├── test/
│   └── e2e/
├── Dockerfile
└── package.json
```

## Installation and Run

From the repository root:

```bash
pnpm install
pnpm --filter @court-booking/backend build
```

### Development

```bash
pnpm --filter @court-booking/backend dev
```

### Production Build

```bash
pnpm --filter @court-booking/backend build
pnpm --filter @court-booking/backend start:prod
```

### Docker

The backend image is built through:

- [`Dockerfile`](Dockerfile)

The local runtime stack is defined in:

- [`../../infra/docker-compose.yml`](../../infra/docker-compose.yml)

## Environment Variables

The backend reads values from the repository root environment files.

| Variable                             | Required | Purpose                                     |
| ------------------------------------ | -------- | ------------------------------------------- |
| `NODE_ENV`                           | Yes      | Runtime environment                         |
| `PORT`                               | Yes      | Backend listen port                         |
| `FE_URL`                             | Yes      | Frontend origin used for CORS               |
| `DB_HOST`                            | Yes      | PostgreSQL host                             |
| `DB_PORT`                            | Yes      | PostgreSQL port                             |
| `DB_NAME`                            | Yes      | PostgreSQL database                         |
| `DB_USER`                            | Yes      | PostgreSQL user                             |
| `DB_PASSWORD`                        | Yes      | PostgreSQL password                         |
| `JWT_SECRET`                         | Yes      | JWT signing secret                          |
| `JWT_EXPIRES_IN`                     | Yes      | Access token TTL                            |
| `JWT_REFRESH_EXPIRES_IN`             | Yes      | Refresh token TTL                           |
| `REDIS_HOST`                         | Yes      | Redis host                                  |
| `REDIS_PORT`                         | Yes      | Redis port                                  |
| `REDIS_USERNAME`                     | No       | Redis ACL username                          |
| `REDIS_PASSWORD`                     | No       | Redis password                              |
| `REDIS_DB`                           | No       | App Redis DB index                          |
| `REDIS_QUEUE_DB`                     | No       | Bull queue Redis DB index                   |
| `REDIS_APP_PREFIX`                   | No       | App Redis key prefix                        |
| `REDIS_TLS_ENABLED`                  | No       | Toggle Redis TLS                            |
| `REDIS_CONNECT_TIMEOUT_MS`           | No       | Redis connect timeout                       |
| `REDIS_COMMAND_TIMEOUT_MS`           | No       | Redis command timeout                       |
| `REDIS_ENABLE_OFFLINE_QUEUE`         | No       | App Redis offline queue behavior            |
| `REDIS_QUEUE_ENABLE_OFFLINE_QUEUE`   | No       | Bull Redis offline queue behavior           |
| `BOOKING_MIN_CANCEL_HOURS`           | Yes      | Cancellation policy threshold               |
| `BOOKING_MAX_DURATION_HOURS`         | Yes      | Maximum booking duration                    |
| `BOOKING_JOB_SCHEDULER_ENABLED`      | No       | Enables repeatable job registration         |
| `BOOKING_JOB_SCHEDULER_LOCK_TTL_MS`  | No       | Startup lock TTL for scheduler bootstrap    |
| `PAYMENT_ENABLED`                    | No       | Global payment feature flag                 |
| `PAYMENT_PROVIDERS_ENABLED`          | No       | Enabled providers list (CSV)                |
| `PAYMENT_RECONCILE_INTERVAL_MINUTES` | No       | Reconcile scan cron step in minutes         |
| `PAYMENT_RECONCILE_STALE_MINUTES`    | No       | Stale threshold before reconcile enqueue    |
| `PAYMENT_RECONCILE_MAX_ATTEMPTS`     | No       | Max reconcile attempts before manual review |
| `PAYMENT_JOB_SCHEDULER_ENABLED`      | No       | Enables payment reconcile scheduler         |
| `PAYMENT_JOB_SCHEDULER_LOCK_TTL_MS`  | No       | Startup lock TTL for payment scheduler      |
| `VNPAY_TMN_CODE`                     | Yes\*    | VNPay terminal code                         |
| `VNPAY_HASH_SECRET`                  | Yes\*    | VNPay HMAC secret                           |
| `VNPAY_PAY_URL`                      | Yes\*    | VNPay payment endpoint                      |
| `VNPAY_QUERY_URL`                    | No       | VNPay query transaction API URL             |
| `VNPAY_REFUND_URL`                   | No       | VNPay refund API URL                        |
| `VNPAY_RETURN_URL`                   | Yes\*    | Frontend return URL after VNPay redirect    |

Reference template:

- [`../../.env.example`](../../.env.example)

`*`: Required when that provider is enabled in `PAYMENT_PROVIDERS_ENABLED`.

## Payment Setup (Production)

Current payment module already includes:

- payment entities (`payments`, `payment_events`, `payment_providers`)
- initiate/status/refund APIs
- VNPay webhook endpoint
- reconcile queue (`payment-jobs`) and stale payment scanner

Provider API integration is still scaffolded (query/refund/create flow placeholders), so before production go-live you must complete provider API calls in provider adapters.
VNPay adapter is implemented for sandbox-first flow; production rollout still requires full sandbox/prod validation and runbook checks.

### Webhook Endpoints To Register

- `POST /api/v1/payments/vnpay/ipn`

Important operational requirements:

- expose backend via HTTPS public URL (no localhost)
- whitelist payment provider outbound IP ranges if your edge firewall is strict
- keep webhook signatures enabled and rotate secrets periodically
- monitor `payment_events` for replay/debug and reconciliation visibility

## API Endpoints

Base URL:

- `http://localhost:3001/api/v1`

Swagger:

- `http://localhost:3001/api/docs`

### Authentication

| Method | Path             | Description                    |
| ------ | ---------------- | ------------------------------ |
| `POST` | `/auth/register` | Register a new user            |
| `POST` | `/auth/login`    | Login and issue cookies/tokens |
| `POST` | `/auth/refresh`  | Refresh access session         |
| `POST` | `/auth/logout`   | Revoke refresh session         |
| `GET`  | `/auth/me`       | Get current authenticated user |
| `GET`  | `/auth/admin`    | Admin identity check           |

### Users

| Method  | Path                | Description                 |
| ------- | ------------------- | --------------------------- |
| `GET`   | `/users/me`         | Get current user profile    |
| `PATCH` | `/users/me`         | Update current user profile |
| `POST`  | `/users/me/avatar`  | Upload avatar               |
| `GET`   | `/users/admin/list` | Admin user listing          |
| `PATCH` | `/users/admin/:id`  | Admin user update           |

### Courts

| Method   | Path                          | Description                |
| -------- | ----------------------------- | -------------------------- |
| `GET`    | `/courts`                     | Public court list          |
| `POST`   | `/courts`                     | Create court               |
| `GET`    | `/courts/districts`           | Public district list       |
| `GET`    | `/courts/admin/deleted`       | Deleted courts for admin   |
| `GET`    | `/courts/:id`                 | Court detail               |
| `PATCH`  | `/courts/:id`                 | Update court               |
| `PATCH`  | `/courts/:id/featured`        | Toggle featured status     |
| `DELETE` | `/courts/:id`                 | Soft delete court          |
| `PATCH`  | `/courts/:id/restore`         | Restore soft-deleted court |
| `DELETE` | `/courts/:id/hard`            | Hard delete court          |
| `GET`    | `/courts/:id/schedule`        | Availability/schedule view |
| `GET`    | `/courts/:id/stats`           | Court statistics           |
| `GET`    | `/courts/:id/time-slots`      | Weekly time slots          |
| `PUT`    | `/courts/:id/time-slots`      | Replace weekly time slots  |
| `POST`   | `/courts/:id/images`          | Upload court image         |
| `DELETE` | `/courts/:id/images/:imageId` | Delete court image         |
| `PATCH`  | `/courts/:id/images/reorder`  | Reorder court images       |
| `PATCH`  | `/courts/:id/images/:imageId` | Update image metadata      |

### Bookings

| Method  | Path                            | Description                  |
| ------- | ------------------------------- | ---------------------------- |
| `POST`  | `/bookings`                     | Create a user booking        |
| `PATCH` | `/bookings/:id/cancel`          | Cancel a user booking        |
| `POST`  | `/bookings/:id/confirm-payment` | Confirm payment              |
| `GET`   | `/bookings/me`                  | Current user's bookings      |
| `GET`   | `/bookings/me/stats`            | Current user's booking stats |
| `GET`   | `/bookings/:id`                 | Booking detail               |

### Payments

| Method  | Path                            | Description                                         |
| ------- | ------------------------------- | --------------------------------------------------- |
| `POST`  | `/payments/initiate`            | Initiate VNPay payment (authenticated)              |
| `GET`   | `/payments/:id/status`          | Read payment and booking status snapshot            |
| `PATCH` | `/payments/:id/refund`          | Refund payment (admin only)                         |
| `POST`  | `/payments/:id/reconcile`       | Trigger reconcile by payment id (admin)             |
| `GET`   | `/payments/admin/lookup`        | Lookup by `providerOrderId`/`providerTxnId` (admin) |
| `GET`   | `/payments/admin/manual-review` | List payments requiring manual review (admin)       |
| `POST`  | `/payments/vnpay/ipn`           | VNPay webhook callback (public, signature-verified) |

### Admin Bookings

| Method  | Path                           | Description                     |
| ------- | ------------------------------ | ------------------------------- |
| `POST`  | `/admin/bookings`              | Create admin booking            |
| `GET`   | `/admin/bookings`              | Admin booking list              |
| `GET`   | `/admin/bookings/overview`     | Admin booking dashboard summary |
| `GET`   | `/admin/bookings/analytics`    | Admin analytics                 |
| `PATCH` | `/admin/bookings/:id/check-in` | Check in a booking              |
| `PATCH` | `/admin/bookings/:id/cancel`   | Admin cancel                    |
| `PATCH` | `/admin/bookings/:id/refund`   | Process refund                  |
| `PATCH` | `/admin/bookings/:id`          | Update booking fields           |

### Reference Data and Settings

| Method   | Path                                           | Description                   |
| -------- | ---------------------------------------------- | ----------------------------- |
| `GET`    | `/features`                                    | Public feature list           |
| `GET`    | `/admin/features`                              | Admin feature list            |
| `POST`   | `/admin/features`                              | Create feature                |
| `PATCH`  | `/admin/features/:id`                          | Update feature                |
| `DELETE` | `/admin/features/:id`                          | Soft delete feature           |
| `DELETE` | `/admin/features/:id/hard`                     | Hard delete feature           |
| `PUT`    | `/courts/:id/features`                         | Sync court features           |
| `GET`    | `/sport-types`                                 | Public sport type list        |
| `GET`    | `/admin/sport-types`                           | Admin sport type list         |
| `POST`   | `/admin/sport-types`                           | Create sport type             |
| `PATCH`  | `/admin/sport-types/:id`                       | Update sport type             |
| `DELETE` | `/admin/sport-types/:id`                       | Soft delete sport type        |
| `DELETE` | `/admin/sport-types/:id/hard`                  | Hard delete sport type        |
| `GET`    | `/admin/slot-templates`                        | List slot templates           |
| `GET`    | `/admin/slot-templates/:id`                    | Slot template detail          |
| `POST`   | `/admin/slot-templates`                        | Create slot template          |
| `PATCH`  | `/admin/slot-templates/:id`                    | Update slot template          |
| `PUT`    | `/admin/slot-templates/:id/items`              | Replace template items        |
| `DELETE` | `/admin/slot-templates/:id`                    | Delete slot template          |
| `POST`   | `/admin/courts/:id/apply-template/:templateId` | Apply template to court       |
| `GET`    | `/settings/runtime`                            | Runtime settings for frontend |
| `GET`    | `/admin/settings`                              | Admin settings read           |
| `PATCH`  | `/admin/settings`                              | Admin settings update         |

### Notifications and Health

| Method  | Path                          | Description                    |
| ------- | ----------------------------- | ------------------------------ |
| `GET`   | `/notifications`              | Notification list              |
| `GET`   | `/notifications/unread-count` | Unread count                   |
| `PATCH` | `/notifications/:id/read`     | Mark one notification as read  |
| `PATCH` | `/notifications/read-all`     | Mark all notifications as read |
| `GET`   | `/health`                     | Health summary                 |

## Database Schema

The backend uses a consolidated migration:

- [`src/database/migrations/1800000000000-InitialFullSchema.ts`](src/database/migrations/1800000000000-InitialFullSchema.ts)

### Core Tables

| Table                 | Purpose                                  |
| --------------------- | ---------------------------------------- |
| `users`               | User and admin accounts                  |
| `refresh_tokens`      | Refresh token persistence and revocation |
| `courts`              | Court master data and lifecycle state    |
| `court_images`        | Court images and display order           |
| `court_time_slots`    | Weekly slot-based pricing                |
| `features`            | Reusable feature catalog                 |
| `court_features`      | Court-to-feature join table              |
| `sport_types`         | Sport catalog                            |
| `bookings`            | Reservation records and lifecycle fields |
| `notifications`       | Notification feed                        |
| `slot_templates`      | Weekly slot template headers             |
| `slot_template_items` | Weekly slot template rows                |
| `system_settings`     | Runtime configuration                    |

### Important Relationships

- `courts.sport_type_id -> sport_types.id`
- `court_images.court_id -> courts.id`
- `court_time_slots.court_id -> courts.id`
- `court_features.court_id -> courts.id`
- `court_features.feature_id -> features.id`
- `bookings.user_id -> users.id`
- `bookings.court_id -> courts.id`
- `notifications.user_id -> users.id`
- `notifications.booking_id -> bookings.id`
- `slot_template_items.template_id -> slot_templates.id`

## Notable Technical Design

### Booking Concurrency Control

- The backend uses PostgreSQL transaction-level advisory locks per court.
- Availability correctness is enforced at the database transaction layer.
- Redis is deliberately not used for booking overlap correctness.

### Court Lifecycle and Historical Integrity

- Courts support `ACTIVE`, `INACTIVE`, and soft-deleted states.
- Future bookings can be cancelled when a court becomes unavailable.
- Historical bookings still retain meaningful court context for user history and admin views.

### Redis Usage

Redis is used for:

- throttling
- auth failed-attempt tracking and temporary lockout
- public/reference-data caching
- Bull queue storage

The service is designed to degrade gracefully when Redis is unavailable for non-critical auth tracking.

### Job Processing

Repeatable Bull jobs cover:

- pending-payment expiration
- confirmed booking completion
- reminder dispatch

Scheduler boot uses a short Redis initialization lock to reduce duplicate repeatable job registration when multiple instances start together.

## Database Operations

### Migrations

```bash
pnpm --filter @court-booking/backend migration:run
pnpm --filter @court-booking/backend migration:revert
```

### Seed

```bash
pnpm --filter @court-booking/backend db:seed
```

Important:

- local use only
- resets schema
- not suitable for persistent environments

## Testing

### Unit Tests

```bash
pnpm --filter @court-booking/backend test
```

### E2E Tests

```bash
docker compose -f infra/docker-compose.yml --env-file .env.docker up -d postgres redis
pnpm --filter @court-booking/backend test:e2e
pnpm --filter @court-booking/backend test:e2e:concurrency
```

## Troubleshooting

### `502 Bad Gateway`

Check the API and reverse proxy logs:

```bash
docker logs court-booking-backend
docker logs court-booking-nginx
```

### Seeded Data Does Not Appear

Make sure you seeded the same database that the running backend is using.

Host-side scripts read `.env`, while Docker services read `.env.docker`.

### Redis Startup Issues

Queue startup behavior depends on the queue Redis settings in `.env` / `.env.docker`, especially:

- `REDIS_QUEUE_ENABLE_OFFLINE_QUEUE`
- `REDIS_QUEUE_DB`
- `REDIS_QUEUE_PREFIX`

## Payment Deployment Guide

For local webhook testing via ngrok and production rollout checklist:

- [`../../docs/payment-local-ngrok-and-production.md`](../../docs/payment-local-ngrok-and-production.md)
