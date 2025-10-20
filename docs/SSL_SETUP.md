# SSL Certificate Setup Guide

## Overview
This guide explains how to set up SSL certificates for RandevuBu Server in both development and production environments.

## Development Environment

### Quick Setup (Self-Signed Certificates)

For local development, you can generate self-signed SSL certificates:

```bash
# Generate self-signed certificate
bash scripts/generate-ssl-cert.sh
```

This creates:
- `nginx/ssl/cert.pem` - SSL certificate
- `nginx/ssl/key.pem` - Private key

**Note:** Browsers will show security warnings for self-signed certificates. This is normal for development.

### Using Development Environment

The development docker-compose (`docker-compose.dev.yml`) runs on HTTP only (port 80) by default. No SSL is needed for development.

## Production Environment

### Option 1: Let's Encrypt (Recommended - Free)

Let's Encrypt provides free SSL certificates with automatic renewal.

#### Using Certbot

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificate (replace yourdomain.com)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be created at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Copy to nginx/ssl directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/ssl/key.pem
```

#### Auto-Renewal Setup

Let's Encrypt certificates expire after 90 days. Set up auto-renewal:

```bash
# Test renewal
sudo certbot renew --dry-run

# Set up automatic renewal (cron job)
sudo crontab -e

# Add this line to renew twice daily:
0 */12 * * * certbot renew --quiet --post-hook "docker compose -f docker-compose.production.yml restart nginx"
```

### Option 2: Commercial Certificate Authority

If you purchased SSL certificates from a provider (GoDaddy, Namecheap, etc.):

1. Download your certificate files
2. Rename them:
   - Certificate: `cert.pem`
   - Private Key: `key.pem`
3. Place in `nginx/ssl/` directory

### Option 3: Cloudflare (Proxy Mode)

If using Cloudflare as a reverse proxy:

1. Set Cloudflare SSL mode to "Full" or "Full (Strict)"
2. Generate Origin Certificate in Cloudflare dashboard
3. Save certificates to `nginx/ssl/`

## Nginx Configuration

The production nginx configuration (`nginx/nginx.conf`) is pre-configured for SSL with:

- **TLS 1.3** only (modern security standard)
- **HSTS** (HTTP Strict Transport Security)
- **OCSP Stapling** (faster SSL handshakes)
- **Strong cipher suites**
- **HTTP to HTTPS redirect**

### Certificate Paths

Update these lines in `nginx/nginx.conf` if your certificates are in different locations:

```nginx
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;
```

## Docker Setup

### Development (HTTP Only)

```bash
make dev
# Server runs on http://localhost:80
```

### Production (HTTPS)

```bash
# 1. Generate/obtain SSL certificates
bash scripts/generate-ssl-cert.sh  # Or use Let's Encrypt

# 2. Start production environment
docker compose -f docker-compose.production.yml up -d

# Server runs on:
# - http://localhost:80 (redirects to HTTPS)
# - https://localhost:443
```

## Verification

Test your SSL configuration:

```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Test SSL connection
curl -vI https://yourdomain.com

# Check SSL rating (production)
# Visit: https://www.ssllabs.com/ssltest/
```

## Security Best Practices

### Certificate Security
- ✅ Never commit private keys to Git (already in `.gitignore`)
- ✅ Use strong key lengths (2048-bit RSA minimum, 4096-bit recommended)
- ✅ Keep private keys secure (chmod 600)
- ✅ Rotate certificates before expiry

### Production Checklist
- [ ] Valid SSL certificate from trusted CA
- [ ] Auto-renewal configured (for Let's Encrypt)
- [ ] HSTS enabled (already configured in nginx.conf)
- [ ] HTTP redirects to HTTPS (already configured)
- [ ] Test on SSL Labs (aim for A+ rating)

## Troubleshooting

### "Certificate not found" error

```bash
# Check if certificates exist
ls -la nginx/ssl/

# Generate self-signed cert for testing
bash scripts/generate-ssl-cert.sh
```

### "Permission denied" errors

```bash
# Fix permissions
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem
```

### Browser security warnings

**Development:** Self-signed certificates will show warnings. Click "Advanced" → "Proceed to site"

**Production:** If using valid CA certificate and still seeing warnings:
1. Check certificate is for correct domain
2. Ensure intermediate certificates are included
3. Verify certificate hasn't expired

## Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
- [Certbot Documentation](https://certbot.eff.org/instructions)

## Support

For issues with SSL setup, check:
1. nginx error logs: `docker compose logs nginx`
2. Certificate validity: `openssl x509 -in nginx/ssl/cert.pem -text -noout`
3. Port availability: `netstat -tulpn | grep :443`
