#!/bin/bash

# Let's Encrypt SSL Certificate Setup Script for RandevuBu
# Usage: ./setup-letsencrypt.sh your-domain.com

set -e

DOMAIN=$1
EMAIL="admin@${DOMAIN}"
NGINX_CONF_DIR="./nginx"
SSL_DIR="./nginx/ssl"
CERTBOT_DIR="./certbot"

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain>"
    echo "Example: $0 api.randevubu.com"
    exit 1
fi

echo "🔒 Setting up Let's Encrypt SSL for domain: $DOMAIN"

# Create directories
mkdir -p $SSL_DIR
mkdir -p $CERTBOT_DIR/www
mkdir -p $CERTBOT_DIR/conf

# Generate DH parameters if not exists
if [ ! -f "$SSL_DIR/dhparam.pem" ]; then
    echo "📝 Generating DH parameters (this may take a while)..."
    openssl dhparam -out $SSL_DIR/dhparam.pem 2048
fi

# Create temporary nginx config for initial setup
cat > $NGINX_CONF_DIR/nginx-temp.conf << EOF
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name $DOMAIN;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://\$host\$request_uri;
        }
    }
}
EOF

# Start nginx with temporary config
echo "🚀 Starting nginx with temporary configuration..."
docker run --rm -d \
    --name nginx-temp \
    -p 80:80 \
    -v $(pwd)/$CERTBOT_DIR/www:/var/www/certbot \
    -v $(pwd)/$NGINX_CONF_DIR/nginx-temp.conf:/etc/nginx/nginx.conf \
    nginx:alpine

# Request SSL certificate
echo "📋 Requesting SSL certificate from Let's Encrypt..."
docker run --rm \
    -v $(pwd)/$CERTBOT_DIR/conf:/etc/letsencrypt \
    -v $(pwd)/$CERTBOT_DIR/www:/var/www/certbot \
    certbot/certbot \
    certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Stop temporary nginx
docker stop nginx-temp

# Copy certificates to nginx ssl directory
echo "📁 Copying certificates..."
cp $CERTBOT_DIR/conf/live/$DOMAIN/fullchain.pem $SSL_DIR/cert.pem
cp $CERTBOT_DIR/conf/live/$DOMAIN/privkey.pem $SSL_DIR/key.pem

# Update nginx configuration with actual domain
sed -i "s/server_name _;/server_name $DOMAIN;/g" $NGINX_CONF_DIR/nginx.conf

# Create renewal script
cat > scripts/renew-ssl.sh << EOF
#!/bin/bash
echo "🔄 Renewing SSL certificates..."
docker run --rm \\
    -v \$(pwd)/$CERTBOT_DIR/conf:/etc/letsencrypt \\
    -v \$(pwd)/$CERTBOT_DIR/www:/var/www/certbot \\
    certbot/certbot renew

# Copy renewed certificates
cp $CERTBOT_DIR/conf/live/$DOMAIN/fullchain.pem $SSL_DIR/cert.pem
cp $CERTBOT_DIR/conf/live/$DOMAIN/privkey.pem $SSL_DIR/key.pem

# Reload nginx
docker exec randevubu-nginx nginx -s reload

echo "✅ SSL certificates renewed successfully!"
EOF

chmod +x scripts/renew-ssl.sh

# Clean up
rm $NGINX_CONF_DIR/nginx-temp.conf

echo "✅ SSL certificate setup completed!"
echo "📝 Certificate files are in: $SSL_DIR"
echo "🔄 To renew certificates, run: ./scripts/renew-ssl.sh"
echo "⚡ You can now start your production environment with: make prod-up"