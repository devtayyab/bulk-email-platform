# Use the official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code and environment files
COPY . .
COPY .env .env

# Build the application
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start:prod"]
