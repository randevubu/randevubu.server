#!/bin/bash

# SSL Certificate Generation Script
# This script generates self-signed SSL certificates for development
# For production, use Let's Encrypt or your certificate provider

set -e

SSL_DIR="./nginx/ssl"
CERT_FILE="$SSL_DIR/cert.pem"
KEY_FILE="$SSL_DIR/key.pem"

echo "🔐 SSL Certificate Generation for RandevuBu Server"
echo "=================================================="
echo ""

# Create SSL directory if it doesn't exist
if [ ! -d "$SSL_DIR" ]; then
  mkdir -p "$SSL_DIR"
  echo "✅ Created SSL directory: $SSL_DIR"
fi

# Check if certificates already exist
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
  echo "⚠️  SSL certificates already exist!"
  echo "   Certificate: $CERT_FILE"
  echo "   Key: $KEY_FILE"
  echo ""
  read -p "Do you want to regenerate them? (y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled. Existing certificates will be used."
    exit 0
  fi
  echo "🔄 Regenerating certificates..."
fi

# Generate self-signed certificate
echo "📝 Generating self-signed SSL certificate..."
echo ""

# Prompt for domain name (optional)
read -p "Enter your domain name (or press Enter for 'localhost'): " DOMAIN
DOMAIN=${DOMAIN:-localhost}

echo ""
echo "Generating certificate for domain: $DOMAIN"
echo ""

# Generate certificate with 365-day validity
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -subj "/C=TR/ST=Istanbul/L=Istanbul/O=RandevuBu/OU=Development/CN=$DOMAIN" \
  -addext "subjectAltName=DNS:$DOMAIN,DNS:www.$DOMAIN,DNS:localhost,IP:127.0.0.1"

echo ""
echo "✅ SSL certificates generated successfully!"
echo ""
echo "📄 Certificate Details:"
echo "   Location: $CERT_FILE"
echo "   Key: $KEY_FILE"
echo "   Domain: $DOMAIN"
echo "   Validity: 365 days"
echo ""
echo "🔒 Certificate Information:"
openssl x509 -in "$CERT_FILE" -text -noout | grep -A 2 "Subject:"
echo ""
echo "⚠️  IMPORTANT NOTES:"
echo "   1. This is a SELF-SIGNED certificate for DEVELOPMENT only"
echo "   2. Browsers will show security warnings (this is normal)"
echo "   3. For PRODUCTION, use Let's Encrypt or a trusted Certificate Authority"
echo ""
echo "🚀 For Production SSL Setup:"
echo "   - Use certbot (Let's Encrypt): https://certbot.eff.org/"
echo "   - Or upload certificates from your provider to: $SSL_DIR"
echo ""
echo "✅ You can now start your server with HTTPS support!"
