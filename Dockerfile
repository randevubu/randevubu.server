# ============================================
# Stage 1: Dependencies (for caching)
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy only package files for better layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (needed for build)
RUN npm ci && \
    npm cache clean --force

# ============================================
# Stage 2: Builder (compile TypeScript)
# ============================================
FROM deps AS builder

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript (without source maps for production)
# Build without source maps and declarations to reduce size
RUN npx tsc --sourceMap false --declaration false --declarationMap false && \
    # Remove any remaining source maps and declaration files (safety net)
    find dist -type f \( -name "*.map" -o -name "*.d.ts" \) -delete 2>/dev/null || true && \
    # Remove test files if any were copied
    find dist -type d \( -name "tests" -o -name "__tests__" \) -exec rm -rf {} + 2>/dev/null || true

# ============================================
# Stage 3: Production (minimal runtime)
# ============================================
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ONLY production dependencies
# Use npm ci for faster, reliable, reproducible builds
RUN npm ci --only=production && \
    npm cache clean --force && \
    # Remove unnecessary files from node_modules to reduce size
    find node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "*.test.js" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type f -name "*.map" -delete 2>/dev/null || true && \
    find node_modules -type f -name "*.d.ts" -delete 2>/dev/null || true && \
    find node_modules -type f -name "*.md" -delete 2>/dev/null || true && \
    find node_modules -type f -name "*.txt" -delete 2>/dev/null || true && \
    find node_modules -type f -name "LICENSE" -delete 2>/dev/null || true && \
    find node_modules -type f -name "CHANGELOG*" -delete 2>/dev/null || true && \
    find node_modules -type f -name "README*" -delete 2>/dev/null || true && \
    find node_modules -type d -name "docs" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "examples" -exec rm -rf {} + 2>/dev/null || true

# Generate Prisma client
RUN npx prisma generate

# Remove unnecessary files to reduce size
RUN rm -rf /tmp/* && \
    rm -rf /var/cache/apk/* && \
    rm -rf /root/.npm && \
    rm -rf /root/.cache && \
    # Remove Prisma CLI after generation (keeps client, removes CLI tools ~30MB)
    rm -rf node_modules/prisma && \
    # Remove npm documentation and man pages
    rm -rf /usr/local/share/man && \
    rm -rf /usr/local/share/doc && \
    # Remove TypeScript from node_modules if present (not needed at runtime)
    rm -rf node_modules/typescript 2>/dev/null || true && \
    # Remove other build tools that might have been installed
    rm -rf node_modules/@types 2>/dev/null || true

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Create logs directory
RUN mkdir -p /app/logs/errors /app/logs/all && \
    chown -R nodejs:nodejs /app/logs

# Remove unnecessary files
RUN rm -rf /tmp/* && \
    rm -rf /var/cache/apk/* && \
    rm -rf /root/.npm && \
    rm -rf /root/.cache

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["node", "dist/index.js"]


# ============================================
# Stage 4: Development (with all dev deps)
# ============================================
FROM node:20-alpine AS development

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# Copy source (will be overridden by bind mount in docker-compose.dev)
COPY . .

# Default dev command (can be overridden)
CMD ["npm", "run", "dev"]