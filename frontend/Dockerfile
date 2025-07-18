# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json and workspace config
COPY package.json ./
COPY package-lock.json* ./

# Copy frontend package files
COPY frontend/package*.json ./frontend/

# Install root dependencies
RUN npm install

# Install frontend dependencies
RUN cd frontend && npm install

# Copy frontend source code
COPY frontend/ ./frontend/

# Copy environment file for build
COPY .env ./

# Build the application
WORKDIR /app/frontend
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Copy built files from builder stage
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Create logs directory
RUN mkdir -p /var/log/nginx

# Expose port
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
