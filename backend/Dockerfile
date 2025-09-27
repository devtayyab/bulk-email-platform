# Use the official Node.js image
FROM node:18-alpine

# Install system dependencies and pnpm
RUN apk add --no-cache libc6-compat && npm install -g pnpm@latest

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./ 

# Install all dependencies (including dev dependencies for building)
RUN pnpm install

# Copy source code and environment files
COPY . .
COPY .env .env

# Build the application
RUN pnpm run build  

# Create uploads directory
RUN mkdir -p uploads

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Start the application
CMD ["pnpm", "run", "start:prod"]
