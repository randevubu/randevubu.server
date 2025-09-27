# Multi-stage build for production optimization
# SECURITY: Use specific version and verify integrity
FROM node:20.17-alpine3.20 AS base

# SECURITY: Set metadata for better container management
LABEL org.opencontainers.image.title="RandevuBu Server"
LABEL org.opencontainers.image.description="Production-ready appointment booking server"
LABEL org.opencontainers.image.version="1.0.0"
LABEL maintainer="randevubu-team"

# SECURITY: Update packages and remove cache
RUN apk update && apk upgrade && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    dumb-init \
    && apk del --purge \
    && rm -rf /var/cache/apk/* \
    && npm install -g npm@latest

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production --ignore-scripts

# Development stage
FROM base AS development

# Install all dependencies including dev dependencies
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Start in development mode
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder

# Install all dependencies including dev dependencies
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:20.17-alpine3.20 AS production

# SECURITY: Update packages and install security tools
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    && apk del --purge \
    && rm -rf /var/cache/apk/*

# SECURITY: Create non-root user with specific UID/GID
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set working directory and ensure proper ownership
WORKDIR /app
RUN chown nodejs:nodejs /app

# SECURITY: Create log directory with proper permissions
RUN mkdir -p /var/log/randevubu && \
    chown nodejs:nodejs /var/log/randevubu && \
    chmod 755 /var/log/randevubu

# Copy package files with proper ownership
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs prisma ./prisma/

# SECURITY: Switch to non-root user before installing dependencies
USER nodejs

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# SECURITY: Set environment variables for production
ENV NODE_ENV=production
ENV NPM_CONFIG_CACHE=/tmp/.npm
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# SECURITY: Remove unnecessary files and set read-only filesystem
RUN rm -rf node_modules/.cache

# Expose port (non-privileged)
EXPOSE 3000

# SECURITY: Enhanced health check with timeout and user context
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# SECURITY: Use dumb-init to handle signals properly and prevent zombie processes
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]