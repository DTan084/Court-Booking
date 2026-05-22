FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Build stage
FROM base AS builder
WORKDIR /app

# Copy manifests first for better layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies required for the build
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared

# Build shared package first, then the backend
RUN ./node_modules/typescript/bin/tsc -p packages/shared/tsconfig.json
RUN cd apps/backend && ../../node_modules/.bin/nest build

# Runtime stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy package manifests for production install
COPY --from=builder /app/package.json .
COPY --from=builder /app/pnpm-lock.yaml .
COPY --from=builder /app/pnpm-workspace.yaml .
COPY --from=builder /app/.npmrc .
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

# Copy built artifacts
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY apps/backend/docker-entrypoint.sh ./apps/backend/docker-entrypoint.sh

# Prevent husky from running in Docker
ENV HUSKY=0

# Install production dependencies only
# bcrypt still needs its install script to build the native module
RUN pnpm install --frozen-lockfile --prod

# Create a non-root user for runtime
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001 \
    && chmod +x /app/apps/backend/docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/app/apps/backend/docker-entrypoint.sh"]
