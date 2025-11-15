# Port Yapılandırması

## Servis Portları

| Servis | Port | URL | Notlar |
|--------|------|-----|--------|
| **App (Backend)** | 3001 | http://localhost:3001 | API endpoint |
| **Frontend** | 3000 | http://localhost:3000 | React/Vue/etc |
| **Grafana** | 4000 | http://localhost:4000 | Monitoring dashboard |
| **Prometheus** | 9090 | http://localhost:9090 | Metrics collection |
| **Nginx** | 80 | http://localhost:80 | HTTP proxy |
| **PostgreSQL** | 5432 | localhost:5432 | Database (internal) |
| **Redis** | 6379 | localhost:6379 | Cache (internal) |

## Erişim Tablosu

### Geliştirme Ortamı (Development)
```bash
# Servisleri başlat
docker-compose -f docker-compose.dev.yml up -d

# Erişim:
# - App: http://localhost:3001
# - Grafana: http://localhost:4000 (admin/admin123)
# - Prometheus: http://localhost:9090
```

### Production Ortamı (Production)
```bash
# Servisleri başlat
docker-compose -f docker-compose.production.yml up -d

# Erişim (EC2'de):
# - App: http://YOUR_EC2_IP:3001
# - Grafana: http://YOUR_EC2_IP:4000 (admin/admin123)
# - Prometheus: http://YOUR_EC2_IP:9090
```

## Port Çakışması Yok! ✅

- ✅ Frontend: 3000
- ✅ Backend: 3001  
- ✅ Grafana: 4000
- ✅ Prometheus: 9090
- ✅ Nginx: 80

## Güvenlik

### Development (Local)
- Grafana: `127.0.0.1:4000` (sadece localhost)
- Prometheus: `127.0.0.1:9090` (sadece localhost)
- **Dışarıdan erişilemez**

### Production (EC2)
- Grafana: `4000:3000` (tüm IP'lerden erişilebilir)
- Prometheus: `9090:9090` (tüm IP'lerden erişilebilir)
- **Güvenlik önerisi**: 
  - Nginx ile reverse proxy kullanın
  - IP whitelist yapın
  - Basic auth ekleyin

## Port Değiştirme

Grafana portunu değiştirmek için:

**docker-compose.dev.yml**:
```yaml
grafana:
  ports:
    - "127.0.0.1:YENI_PORT:3000"  # Örnek: 5000
```

Sonra restart:
```bash
docker-compose -f docker-compose.dev.yml up -d grafana
```

## Hızlı Erişim

```bash
# Grafana'yı aç
start http://localhost:4000

# Prometheus'u aç
start http://localhost:9090

# App'i aç
start http://localhost:3001
```














