# Grafana Metrics Guide - Your App Data

## ✅ Your Metrics Are Working!

I just checked - your app is exposing metrics! Here's what's available:

## 📊 Available Metrics

### 1. **HTTP Request Metrics**
```
randevubu_http_requests_total
randevubu_http_request_duration_seconds
randevubu_active_connections
```

### 2. **System Metrics**
```
randevubu_process_resident_memory_bytes
randevubu_nodejs_heap_size_used_bytes
randevubu_process_cpu_seconds_total
```

### 3. **Database Metrics**
```
randevubu_db_query_duration_seconds
randevubu_db_queries_total
```

### 4. **Business Metrics** (currently 0, will populate as you use the app)
```
randevubu_appointments_created_total
randevubu_payments_processed_total
randevubu_notifications_sent_total
```

## 🎯 How to View in Grafana

### Step 1: Go to Explore
1. Click "Explore" (compass icon) in left sidebar
2. Select "Prometheus" from data source dropdown at top

### Step 2: Try These Queries

**Query 1: Total Requests**
```
randevubu_http_requests_total
```

**Query 2: Request Rate (per second)**
```
rate(randevubu_http_requests_total[1m])
```

**Query 3: Response Time (95th percentile)**
```
histogram_quantile(0.95, rate(randevubu_http_request_duration_seconds_bucket[5m]))
```

**Query 4: Memory Usage**
```
randevubu_process_resident_memory_bytes / 1024 / 1024
```

**Query 5: Active Connections**
```
randevubu_active_connections
```

### Step 3: Make More API Calls (to see data change)

Open a new terminal:
```bash
# Make API calls
curl http://localhost:3001/api/v1/auth/verify

# Make multiple calls
for i in {1..10}; do curl http://localhost:3001/api/v1/ ; done

# Now refresh Grafana and see the metrics update!
```

## 📈 Understanding Your Data

Right now you have:
- ✅ **41 total HTTP requests** 
- ✅ Routes tracked: `/refresh`, `/profile`, `/my-business`, `/plans`
- ✅ **0 active connections** (idle)
- ✅ **~900MB memory** used

## 🎨 Create Your Own Dashboard

1. Go to **Dashboards** → **New Dashboard**
2. Click **Add visualization**
3. Select **Prometheus** data source
4. Paste a query from above
5. Click **Run query**
6. Adjust visualization type (Time series, Stat, Gauge, etc.)
7. Save!

## 🚀 Quick Tips

- **Time range**: Top right corner - select "Last 5 minutes"
- **Refresh**: Auto-refresh every 10s
- **Split view**: Compare multiple queries side-by-side
- **Inspect**: Click query inspector to see raw data

Try it now! Go to Explore and paste these queries! 🎉

















