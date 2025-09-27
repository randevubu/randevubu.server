# SSL Certificate Setup

## For Development (Self-signed)

Generate self-signed certificates for development:

```bash
# Generate private key
openssl genrsa -out key.pem 2048

# Generate certificate
openssl req -new -x509 -key key.pem -out cert.pem -days 365 -subj "/C=TR/ST=Istanbul/L=Istanbul/O=RandevuBu/CN=localhost"

# Generate DH parameters
openssl dhparam -out dhparam.pem 2048
```

## For Production (Let's Encrypt)

1. Update your domain in the nginx configuration
2. Use the included Let's Encrypt setup script:

```bash
# Run the Let's Encrypt setup
./scripts/setup-letsencrypt.sh your-domain.com
```

## Certificate Files

- `cert.pem` - SSL certificate
- `key.pem` - Private key
- `dhparam.pem` - Diffie-Hellman parameters for perfect forward secrecy

## Security Notes

- Never commit private keys to version control
- Rotate certificates regularly
- Monitor certificate expiration dates
- Use strong DH parameters (2048-bit minimum)