# Testing Monitoring Setup (Turkish)

## 🔒 Güvenlik

**ÖNEMLİ**: Grafana ve Prometheus **SADECE LOCALHOST** üzerinden erişilebilir durumda!
- Port binding: `127.0.0.1:4000` (Grafana) ve `127.0.0.1:9090` (Prometheus)
- Dışarıdan erişilemez
- Sadece sizin bilgisayarınızdan erişim var

## 🚀 Servisler Çalışıyor

Aşağıdaki bağlantılara tıklayarak veya tarayıcıda açarak test edebilirsiniz:

## 📊 Erişim Noktaları

### 1. Grafana (Dashboard)
- **URL**: http://localhost:4000
- **Kullanıcı**: `admin`
- **Şifre**: `admin123`
- **Ne yapabilirsiniz**:
  - Dashboards görüntüleme
  - Metrics keşfetme
  - Query yazma
  - Grafikler oluşturma

### 2. Prometheus (Metrics)
- **URL**: http://localhost:9090
- **Kimlik doğrulama**: Yok (sadece localhost)
- **Ne yapabilirsiniz**:
  - PromQL queries yazma
  - Metrics listeleme
  - Targets kontrol etme
  - Configuration görüntüleme

### 3. Application Metrics
- **URL**: http://localhost:3001/metrics
- **Ne yapabilirsiniz**:
  - Raw metrics görüntüleme
  - Prometheus'un topladığı veriyi görmek

## 🧪 Test Senaryoları

### Senaryo 1: Grafana'ya Giriş
```bash
# 1. Tarayıcıda aç: http://localhost:4000
# 2. Login: admin / admin123
# 3. Dashboard'ları görüntüle
# 4. Home > Dashboards > RandevuBu Server Monitoring
```

### Senaryo 2: Prometheus Targets Kontrol
```bash
# 1. Tarayıcıda aç: http://localhost:9090/targets
# 2. "randevubu-app" target'ının UP olduğunu gör
# 3. Scrape interval: 10s
# 4. Last scrape time'ı kontrol et
```

### Senaryo 3: Prometheus Query Test
```bash
# 1. http://localhost:9090 aç
# 2. Query kutusuna yaz: rate(http_requests_total[5m])
# 3. Execute butonuna bas
# 4. Sonuçları gör
```

### Senaryo 4: Application Metrics Kontrol
```bash
# Terminal'de:
curl http://localhost:3001/metrics

# Çıktıda göreceksiniz:
# randevubu_http_requests_total
# randevubu_http_request_duration_seconds
# randevubu_cache_operations_total
# vs...
```

## ✅ Kontrol Listesi

- [ ] Grafana localhost'tan erişilebilir mi?
- [ ] Prometheus localhost'tan erişilebilir mi?
- [ ] Login yapabiliyor musunuz? (admin/admin123)
- [ ] Dashboard'lar görünüyor mu?
- [ ] Prometheus targets UP mı?
- [ ] Metrics toplanıyor mu?
- [ ] Dışarıdan erişilemiyor mu? (localhost dışından)

## 🔍 İleri Seviye Testler

### Custom Query Yazma
Prometheus'ta query örnekleri:
```promql
# Request rate
rate(http_requests_total[5m])

# Response time (95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100
```

### Grafana'da Alert Kurulumu
```bash
# 1. Grafana'da: Configuration > Alerting
# 2. New alert rule
# 3. Condition: When avg() is above X
# 4. Notification channel ekle
```

## 🔧 Sorun Giderme

### Grafana açılmıyor
```bash
# Container'ı kontrol et
docker logs randevubu-grafana-dev

# Restart et
docker restart randevubu-grafana-dev

# Port kontrol et
docker ps | findstr grafana
# 127.0.0.1:4000->3000/tcp olmalı
```

### Prometheus targets DOWN gösteriyor
```bash
# App'in çalıştığını kontrol et
docker ps | findstr app

# Metrics endpoint'i test et
curl http://localhost:3001/metrics

# Prometheus config'i kontrol et
cat monitoring/prometheus/prometheus.yml
```

### Metrics toplanmıyor
```bash
# App loglarını kontrol et
docker logs randevubu-dev

# Prometheus loglarını kontrol et
docker logs randevubu-prometheus-dev

# Network connectivity test
docker exec randevubu-prometheus-dev wget -O- http://app:3001/metrics
```

## 📈 Ne Yapmalısınız Şimdi?

1. **Grafana'ya giriş yapın**: http://localhost:4000
2. **Dashboard'u kontrol edin**: RandevuBu Server Monitoring
3. **Prometheus'u keşfedin**: http://localhost:9090
4. **RequestId ile bir request trace edin**: 
   - API'den bir request yapın
   - Response header'da `X-Request-ID` var mı kontrol edin
   - Loglar'da aynı ID'yi arayın

## 🎯 Production'da Ne Değişecek?

Production'da (EC2):
- Ports tüm IP'lere açılabilir (firewall ile korumalı)
- Nginx reverse proxy ile güvenlik ekleyebilirsiniz
- IP whitelist yapabilirsiniz
- Basic auth ekleyebilirsiniz

**Şimdilik localhost güvenliği yeterli!** 🛡️

