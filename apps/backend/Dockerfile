FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Build stage
FROM base AS builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (all)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared

# Build shared package then backend
RUN pnpm --filter @court-booking/shared build
RUN pnpm --filter @court-booking/backend build

# Runner stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

# Copy artifacts from builder
COPY --from=builder /app/package.json .
COPY --from=builder /app/pnpm-lock.yaml .
COPY --from=builder /app/pnpm-workspace.yaml .
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/shared ./packages/shared

# Install ONLY production dependencies (including shared if it has any)
RUN pnpm install --prod --frozen-lockfile --filter @court-booking/backend

EXPOSE 3001
CMD ["node", "apps/backend/dist/main"]
