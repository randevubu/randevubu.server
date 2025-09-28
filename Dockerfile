# Multi-stage build for production optimization
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies for native modules (bcrypt, etc.)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && npm install -g npm@latest

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
FROM node:20-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]