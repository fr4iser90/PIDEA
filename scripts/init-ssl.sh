#!/bin/bash

# Automatic SSL Initialization Script
# Runs inside Docker container to set up SSL certificates

set -e

SSL_DIR="/etc/nginx/ssl"
WEBROOT_DIR="/var/www/html"
DOMAIN="${SSL_DOMAIN:-}"
EMAIL="${SSL_EMAIL:-}"

echo "🔐 Initializing SSL certificates for $DOMAIN..."

# Check if certificates already exist
if [ -f "$SSL_DIR/cert.pem" ] && [ -f "$SSL_DIR/key.pem" ]; then
    echo "✅ SSL certificates already exist, skipping initialization"
    exit 0
fi

# Check if domain and email are set
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "❌ SSL_DOMAIN or SSL_EMAIL not set in environment"
    echo "   Please set these variables in your .env file:"
    echo "   SSL_DOMAIN=pidea.yourdomain.com"
    echo "   SSL_EMAIL=your@email.com"
    exit 1
fi

# Create directories
mkdir -p "$SSL_DIR"
mkdir -p "$WEBROOT_DIR"

# Wait for nginx to be ready
echo "⏳ Waiting for nginx to be ready..."
until curl -s http://nginx-proxy:80 > /dev/null 2>&1; do
    echo "   Waiting for nginx..."
    sleep 2
done

# Get SSL certificate
echo "📜 Getting SSL certificate from Let's Encrypt..."
certbot certonly --webroot \
    --webroot-path="$WEBROOT_DIR" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --domains "$DOMAIN" \
    --keep-until-expiring

# Copy certificates to nginx directory
echo "📁 Copying certificates to nginx directory..."
cp /etc/letsencrypt/live/"$DOMAIN"/fullchain.pem "$SSL_DIR/cert.pem"
cp /etc/letsencrypt/live/"$DOMAIN"/privkey.pem "$SSL_DIR/key.pem"

# Set proper permissions
chmod 644 "$SSL_DIR/cert.pem"
chmod 600 "$SSL_DIR/key.pem"

echo "✅ SSL certificates initialized successfully!"
echo "🌐 Domain: $DOMAIN"
echo "📧 Email: $EMAIL"

# Reload nginx to use new certificates
echo "🔄 Reloading nginx..."
curl -s http://nginx-proxy:80/reload > /dev/null 2>&1 || true 