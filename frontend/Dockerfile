FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./frontend/

RUN cd frontend && npm ci

COPY frontend/ ./frontend/

ARG DOMAIN=
ENV DOMAIN=${DOMAIN}

WORKDIR /app/frontend
RUN npm run build

FROM nginx:alpine

COPY frontend/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

RUN mkdir -p /var/log/nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
