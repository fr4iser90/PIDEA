FROM node:20-alpine

WORKDIR /app

# Copy root package.json and workspace config
COPY package.json ./
COPY package-lock.json* ./

# Copy backend package files
COPY backend/package*.json ./backend/

# Install root dependencies (includes module-alias)
RUN npm install

# Install backend dependencies
RUN cd backend && npm install

# Copy backend source code
COPY backend/ ./backend/

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 3000

# Start directly with node
CMD ["node", "server.js"]
