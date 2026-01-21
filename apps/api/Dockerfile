# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy root package files for monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all packages and apps (needed for workspace dependencies)
COPY packages ./packages
COPY apps ./apps

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the API and its dependencies
RUN pnpm turbo build --filter=@pickle-play/api

# Production stage
FROM node:20-alpine AS runner

# Install pnpm for production
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/utils/package.json ./packages/utils/
COPY --from=builder /app/packages/validation/package.json ./packages/validation/

# Copy built files
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/packages/validation/dist ./packages/validation/dist

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Set ownership
RUN chown -R hono:nodejs /app

# Switch to non-root user
USER hono

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose the API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the server
WORKDIR /app/apps/api
CMD ["node", "dist/index.js"]
