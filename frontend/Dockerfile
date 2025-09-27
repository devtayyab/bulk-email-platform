# Base image
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat && npm install -g pnpm@latest

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# Production runner
FROM node:18-alpine AS runner
WORKDIR /app

# Install pnpm in runner for the CMD
RUN apk add --no-cache libc6-compat && npm install -g pnpm@latest

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy required files for runtime
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next

USER nextjs

EXPOSE 3000

# Start with pnpm next start
CMD ["pnpm", "next", "start"]
