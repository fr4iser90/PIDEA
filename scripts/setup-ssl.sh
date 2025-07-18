#!/bin/bash

# SSL Setup Script for PIDEA
# This script generates self-signed SSL certificates for development

set -e

SSL_DIR="nginx/ssl"
DOMAIN="localhost"

echo "🔐 Setting up SSL certificates for PIDEA..."

# Create SSL directory
mkdir -p "$SSL_DIR"

# Generate self-signed certificate
echo "📝 Generating self-signed certificate for $DOMAIN..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/key.pem" \
    -out "$SSL_DIR/cert.pem" \
    -subj "/C=DE/ST=NRW/L=Cologne/O=PIDEA/OU=Development/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:localhost,IP:127.0.0.1,IP:::1"

# Set proper permissions
chmod 600 "$SSL_DIR/key.pem"
chmod 644 "$SSL_DIR/cert.pem"

echo "✅ SSL certificates generated successfully!"
echo "📁 Certificate location: $SSL_DIR/"
echo "🔑 Key file: $SSL_DIR/key.pem"
echo "📜 Cert file: $SSL_DIR/cert.pem"
echo ""
echo "⚠️  Note: These are self-signed certificates for development only."
echo "   For production, use Let's Encrypt or a proper CA certificate."
echo ""
echo "🚀 You can now start the production stack with:"
echo "   docker compose -f docker-compose.prod.yml up --build" 