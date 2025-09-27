#!/bin/bash

# SSL/TLS Setup Script for RandevuBu Production
# This script sets up Let's Encrypt SSL certificates

set -e

# Configuration
DOMAIN="randevubu.com"
EMAIL="your-email@domain.com"
NGINX_CONF="/etc/nginx/sites-available/randevubu"
CERTBOT_DIR="/etc/letsencrypt"

echo "🔐 Setting up SSL/TLS for $DOMAIN"

# Create nginx directory structure
mkdir -p nginx/ssl
mkdir -p nginx/logs

# Generate Diffie-Hellman parameters (this will take a while)
echo "🔑 Generating Diffie-Hellman parameters..."
if [ ! -f "nginx/ssl/dhparam.pem" ]; then
    openssl dhparam -out nginx/ssl/dhparam.pem 2048
fi

# Create temporary self-signed certificates for initial setup
echo "📄 Creating temporary self-signed certificates..."
if [ ! -f "nginx/ssl/cert.pem" ]; then
    openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
        -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \
        -subj "/CN=$DOMAIN" \
        -addext "subjectAltName=DNS:$DOMAIN,DNS:www.$DOMAIN"
fi

echo "✅ Temporary certificates created"

# Start nginx with basic config for Let's Encrypt challenge
echo "🌐 Starting nginx for Let's Encrypt challenge..."
docker-compose -f docker-compose.prod.yml up -d nginx

# Wait for nginx to be ready
sleep 10

# Request Let's Encrypt certificates
echo "🔒 Requesting Let's Encrypt certificates..."
docker run --rm \
    -v "$(pwd)/nginx/ssl:/etc/letsencrypt" \
    -v "$(pwd)/nginx/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# Copy certificates to nginx ssl directory
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "📋 Copying Let's Encrypt certificates..."
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" nginx/ssl/cert.pem
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" nginx/ssl/key.pem
    chmod 600 nginx/ssl/key.pem
fi

# Restart nginx with SSL configuration
echo "♻️  Restarting nginx with SSL configuration..."
docker-compose -f docker-compose.prod.yml restart nginx

# Set up certificate renewal
echo "⏰ Setting up certificate auto-renewal..."
cat > scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script
docker run --rm \
    -v "$(pwd)/nginx/ssl:/etc/letsencrypt" \
    -v "$(pwd)/nginx/www:/var/www/certbot" \
    certbot/certbot renew \
    --webroot \
    --webroot-path=/var/www/certbot

# Copy renewed certificates
if [ -f "/etc/letsencrypt/live/randevubu.com/fullchain.pem" ]; then
    cp "/etc/letsencrypt/live/randevubu.com/fullchain.pem" nginx/ssl/cert.pem
    cp "/etc/letsencrypt/live/randevubu.com/privkey.pem" nginx/ssl/key.pem
    chmod 600 nginx/ssl/key.pem
    docker-compose -f docker-compose.prod.yml restart nginx
fi
EOF

chmod +x scripts/renew-ssl.sh

# Add cron job for auto-renewal (runs twice daily)
echo "📅 Setting up cron job for certificate renewal..."
(crontab -l 2>/dev/null; echo "0 */12 * * * /path/to/randevubu/scripts/renew-ssl.sh") | crontab -

echo "✅ SSL/TLS setup complete!"
echo ""
echo "🔐 Your site is now secured with SSL/TLS"
echo "🌐 Visit: https://$DOMAIN"
echo "⏰ Certificates will auto-renew twice daily"
echo ""
echo "Next steps:"
echo "1. Update your DNS to point to this server"
echo "2. Update the domain name in this script"
echo "3. Update the email address for Let's Encrypt notifications"