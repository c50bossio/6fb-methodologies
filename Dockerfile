# 6FB Workbook System - Production Dockerfile
# Multi-stage build optimized for security, performance, and minimal attack surface
# Supports Socket.io, audio processing, and workbook features

# ==============================================
# Stage 1: Dependencies Installation
# ==============================================
FROM node:20-alpine AS dependencies

# Security: Create non-root user early
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with npm ci for production builds
RUN npm ci --only=production && npm cache clean --force

# ==============================================
# Stage 2: Build Stage
# ==============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the Next.js application
RUN npm run build

# ==============================================
# Stage 3: Production Runtime
# ==============================================
FROM node:20-alpine AS production

# Security: Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    postgresql-client \
    redis-tools \
    ffmpeg \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set working directory
WORKDIR /app

# Copy production dependencies from dependencies stage
COPY --from=dependencies --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./server.js
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs

# Create necessary directories with proper permissions
RUN mkdir -p /app/.next/cache && \
    chown -R nextjs:nodejs /app/.next

# Security: Set file permissions
RUN chmod -R 755 /app && \
    chmod -R 644 /app/.next && \
    chmod 755 /app/.next

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application with custom server
CMD ["node", "server.js"]

# ==============================================
# Development Dockerfile (for local development)
# ==============================================
FROM node:20-alpine AS development

# Install development tools
RUN apk add --no-cache git curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Switch to non-root user
USER nextjs

# Copy source code (this will be overridden by volume mount in development)
COPY --chown=nextjs:nodejs . .

# Expose port
EXPOSE 3000

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Development environment
ENV NODE_ENV=development

# Start development server
CMD ["npm", "run", "dev"]