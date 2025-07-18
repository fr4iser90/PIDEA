#!/bin/bash

# Production SSL Setup Script for PIDEA
# Uses Certbot to get real SSL certificates from Let's Encrypt

set -e

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "❌ Usage: $0 <domain> <email>"
    echo "   Example: $0 pidea.yourdomain.com your@email.com"
    exit 1
fi

SSL_DIR="nginx/ssl"
CERTBOT_DIR="/etc/letsencrypt/live/$DOMAIN"

echo "🔐 Setting up PRODUCTION SSL certificates for $DOMAIN..."

# Check if domain is reachable
echo "🌐 Checking if domain $DOMAIN is reachable..."
if ! nslookup "$DOMAIN" > /dev/null 2>&1; then
    echo "❌ Domain $DOMAIN is not reachable!"
    echo "   Make sure your domain points to this server's IP address."
    exit 1
fi

# Install Certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    if command -v apt-get &> /dev/null; then
        # Ubuntu/Debian
        sudo apt-get update
        sudo apt-get install -y certbot
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        sudo yum install -y certbot
    elif command -v dnf &> /dev/null; then
        # Fedora
        sudo dnf install -y certbot
    else
        echo "❌ Could not install Certbot automatically."
        echo "   Please install Certbot manually: https://certbot.eff.org/"
        exit 1
    fi
fi

# Stop nginx if running (needed for standalone mode)
echo "🛑 Stopping nginx if running..."
sudo systemctl stop nginx 2>/dev/null || true
docker compose -f docker-compose.prod.yml stop nginx-proxy 2>/dev/null || true

# Get SSL certificate
echo "📜 Getting SSL certificate from Let's Encrypt..."
sudo certbot certonly --standalone \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --domains "$DOMAIN"

# Create SSL directory
mkdir -p "$SSL_DIR"

# Copy certificates to project directory
echo "📁 Copying certificates to project directory..."
sudo cp "$CERTBOT_DIR/fullchain.pem" "$SSL_DIR/cert.pem"
sudo cp "$CERTBOT_DIR/privkey.pem" "$SSL_DIR/key.pem"

# Set proper permissions
sudo chown $(whoami):$(whoami) "$SSL_DIR/cert.pem" "$SSL_DIR/key.pem"
chmod 644 "$SSL_DIR/cert.pem"
chmod 600 "$SSL_DIR/key.pem"

echo "✅ PRODUCTION SSL certificates generated successfully!"
echo "📁 Certificate location: $SSL_DIR/"
echo "🔑 Key file: $SSL_DIR/key.pem"
echo "📜 Cert file: $SSL_DIR/cert.pem"
echo "🌐 Domain: $DOMAIN"
echo ""
echo "🚀 You can now start the production stack with:"
echo "   docker compose -f docker-compose.prod.yml up --build"
echo ""
echo "🔄 To renew certificates automatically, add to crontab:"
echo "   0 12 * * * /usr/bin/certbot renew --quiet" 