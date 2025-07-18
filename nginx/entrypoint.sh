#!/bin/bash

# Nginx Entrypoint with Automatic SSL Initialization

set -e

echo "🚀 Starting Nginx with automatic SSL initialization..."

# Start nginx in background
echo "📡 Starting nginx..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Wait a moment for nginx to start
sleep 3

# Initialize SSL certificates if needed
echo "🔐 Checking SSL certificates..."
if [ ! -f "/etc/nginx/ssl/cert.pem" ] || [ ! -f "/etc/nginx/ssl/key.pem" ]; then
    echo "📜 SSL certificates not found, initializing..."
    /usr/local/bin/init-ssl.sh
else
    echo "✅ SSL certificates already exist"
fi

# Set up automatic renewal cron job
echo "🔄 Setting up automatic SSL renewal..."
echo "0 12 * * * /usr/bin/certbot renew --webroot --webroot-path=/var/www/html --quiet && nginx -s reload" | crontab -

# Start cron daemon
crond

echo "✅ Nginx started successfully with SSL support!"
echo "🌐 HTTP: http://localhost"
echo "🔒 HTTPS: https://localhost"

# Wait for nginx process
wait $NGINX_PID 