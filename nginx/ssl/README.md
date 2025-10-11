# SSL Configuration for Production

## Setup Instructions

### 1. Generate SSL Certificates

#### Option A: Let's Encrypt (Recommended for production)
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/ssl/key.pem
```

#### Option B: Self-signed certificates (Development only)
```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./nginx/ssl/key.pem \
  -out ./nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

### 2. Update nginx.conf for HTTPS

Uncomment the HTTPS server block in `nginx/nginx.conf` and update the domain name:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;  # Change this to your domain
    
    # SSL configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of configuration
}
```

### 3. Security Best Practices

- Use strong SSL protocols (TLS 1.2+)
- Enable HSTS headers
- Regular certificate renewal
- Monitor certificate expiration

### 4. File Permissions

```bash
# Set proper permissions
chmod 600 ./nginx/ssl/key.pem
chmod 644 ./nginx/ssl/cert.pem
```

## Production Checklist

- [ ] SSL certificates installed
- [ ] HTTPS redirect configured
- [ ] HSTS headers enabled
- [ ] Certificate auto-renewal setup
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Monitoring configured


