#!/bin/bash

# Generate Development SSL Certificates for RandevuBu
# This script creates self-signed certificates for local development

set -e

SSL_DIR="./nginx/ssl"

echo "🔒 Generating development SSL certificates..."

# Create SSL directory if it doesn't exist
mkdir -p $SSL_DIR

# Generate private key
echo "📝 Generating private key..."
openssl genrsa -out $SSL_DIR/key.pem 2048

# Generate certificate
echo "📝 Generating self-signed certificate..."
openssl req -new -x509 -key $SSL_DIR/key.pem -out $SSL_DIR/cert.pem -days 365 \
    -subj "/C=TR/ST=Istanbul/L=Istanbul/O=RandevuBu/OU=Development/CN=localhost"

# Generate DH parameters
echo "📝 Generating DH parameters..."
openssl dhparam -out $SSL_DIR/dhparam.pem 2048

# Set appropriate permissions
chmod 600 $SSL_DIR/key.pem
chmod 644 $SSL_DIR/cert.pem
chmod 644 $SSL_DIR/dhparam.pem

echo "✅ Development SSL certificates generated successfully!"
echo "📁 Certificates location: $SSL_DIR"
echo "⚠️  Note: These are self-signed certificates for development only"
echo "🌐 Access your app at: https://localhost"
echo "⚡ Start production environment with: make prod-up"