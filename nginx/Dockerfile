FROM nginx:alpine

# Install required packages
RUN apk add --no-cache \
    certbot \
    curl \
    bash

# Copy SSL initialization script
COPY scripts/init-ssl.sh /usr/local/bin/init-ssl.sh
RUN chmod +x /usr/local/bin/init-ssl.sh

# Copy nginx configuration
COPY nginx-proxy.conf /etc/nginx/nginx.conf

# Create webroot directory
RUN mkdir -p /var/www/html

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"] 