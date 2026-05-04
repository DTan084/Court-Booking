# Court Booking System

> Enterprise-grade court booking platform built with NestJS + Next.js 14

## Tech Stack

| Layer    | Technology                                |
| -------- | ----------------------------------------- |
| Backend  | NestJS 10, TypeORM, PostgreSQL 16         |
| Frontend | Next.js 14 (App Router), TanStack Query   |
| Auth     | JWT + Passport, NextAuth                  |
| State    | Zustand (client), TanStack Query (server) |
| Styling  | Tailwind CSS + shadcn/ui                  |
| Infra    | Docker, Nginx, GitHub Actions             |
| Monorepo | pnpm workspaces                           |

## Project Structure

```
court-booking/
├── apps/
│   ├── backend/          # NestJS API server
│   └── frontend/         # Next.js 14 web app
├── packages/
│   └── shared/           # Shared types & constants
├── infra/                # Docker & Nginx configs
├── .github/workflows/    # CI/CD pipelines
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 9
- PostgreSQL 16
- Redis

### Installation

```bash
# Install dependencies
pnpm install

# Copy env file
cp .env.example .env

# Start development
pnpm dev
```

### Scripts

| Command       | Description                |
| ------------- | -------------------------- |
| `pnpm dev`    | Start all apps in dev mode |
| `pnpm dev:be` | Start backend only         |
| `pnpm dev:fe` | Start frontend only        |
| `pnpm build`  | Build all apps             |
| `pnpm test`   | Run all tests              |
| `pnpm lint`   | Lint all workspaces        |

## License

MIT
