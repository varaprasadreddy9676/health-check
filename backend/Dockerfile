# Base Node.js image
FROM node:18-alpine AS base

# Set the working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache dumb-init

# Development stage
FROM base AS development

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM base AS production

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy built application from the development stage
COPY --from=development /app/dist ./dist

# Copy templates
COPY --from=development /app/src/templates ./dist/templates

# Use dumb-init as PID 1
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]