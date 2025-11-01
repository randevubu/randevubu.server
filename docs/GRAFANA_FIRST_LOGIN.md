# Grafana İlk Giriş Sorun Giderme

## 🔓 Varsayılan Grafana Giriş Bilgileri

### İlk Kurulum (Fresh Install)
```bash
Username: admin
Password: admin
```

### İlk Girişten Sonra
Grafana ilk girişte şifre değiştirmenizi ister:
1. Eski şifre: `admin`
2. Yeni şifre: `admin123` (veya istediğiniz şifre)

## 🔧 Sorun: "Invalid username or password"

### Çözüm 1: Varsayılan Bilgilerle Giriş
```bash
Username: admin
Password: admin
```

### Çözüm 2: Container'ı Resetle
Eğer admin/admin ile giriş yapamazsanız:

```bash
# 1. Container'ı durdur
docker stop randevubu-grafana-dev

# 2. Volume'u sil (Tüm veriler silinecek!)
docker volume rm randevubu-server_grafana_dev_data

# 3. Container'ı yeniden başlat
docker-compose -f docker-compose.dev.yml up -d grafana

# 4. Şimdi admin/admin ile giriş yapın
```

### Çözüm 3: Environment Variable Kontrol
docker-compose.dev.yml'de:
```yaml
environment:
  - GF_SECURITY_ADMIN_PASSWORD=admin123
  - GF_USERS_ALLOW_SIGN_UP=false
```

Bu ayar yeni kurulumda admin şifresini `admin123` olarak ayarlar.

## ✅ Kontrol Listesi

1. [ ] Container çalışıyor mu?
   ```bash
   docker ps | findstr grafana
   ```

2. [ ] Port 4000'e bağlı mı?
   ```bash
   docker ps | findstr "4000"
   # Çıktı: 127.0.0.1:4000->3000/tcp
   ```

3. [ ] Tarayıcıda açın: http://localhost:4000

4. [ ] Giriş bilgileri:
   - **İLK GİRİŞ**: admin / admin
   - **Sonra**: admin / admin123

## 🎯 Doğru Sıralama

1. Container başlatılır
2. İlk kez: **admin / admin** ile giriş yap
3. Grafana şifre değiştirme ekranını gösterir
4. `admin123` gibi yeni bir şifre belirle
5. Dashboard'a eriş!

## 📝 Not

Grafana'da `GF_SECURITY_ADMIN_PASSWORD` environment variable'ı kullanılıyorsa, bu direkt admin şifresi değil. Sadece otomatik setup sırasında kullanılır.

Gerçek şifre her zaman başta **admin/admin**'dir ve ilk girişte değiştirilir!







