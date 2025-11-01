# Grafana Quick Start Guide

## 🎯 Step-by-Step: View Your Data in Grafana

### Step 1: Add Prometheus as Data Source ✅

Your Prometheus should already be connected! Let's verify:

1. In Grafana, click **"Connections"** (chain icon) in the left sidebar
2. Click **"Data sources"** 
3. You should see **"Prometheus"** listed with a green checkmark ✅
4. If you see it:
   - Click on **"Prometheus"**
   - The URL should be: `http://prometheus:9090`
   - Click **"Save & test"**
   - You should see: "Data source is working" ✅

### Step 2: Check Your Metrics Are Being Collected

1. Click **"Explore"** (compass icon) in the left sidebar
2. At the top, select **"Prometheus"** from the data source dropdown
3. In the query box, type: `randevubu_http_requests_total`
4. Click **"Run query"**
5. **You should see data!** 📊

### Step 3: Import Your Dashboard

1. Click **"Dashboards"** (grid icon) in the left sidebar
2. Click the **"Import"** button (top right)
3. You have two options:

   **Option A: Import by JSON**
   - Click **"Upload JSON file"**
   - Navigate to: `monitoring/grafana/dashboards/randevubu-dashboard.json`
   - Click **"Import"**

   **Option B: Import manually**
   - Click **"Import"**
   - Upload the JSON file
   - Select **"Prometheus"** as data source
   - Click **"Import"**

4. You should now see your dashboard with real metrics!

### Step 4: Test Your App to Generate Metrics

Open a new terminal and make some API calls:

```bash
# Make API requests to generate metrics
curl http://localhost:3001/health

# Or make more requests
curl http://localhost:3001/api/v1/

# Watch the metrics update in Grafana!
```

### Step 5: View Your Dashboard

1. In Grafana, click **"Dashboards"** → **"Browse"**
2. Find **"RandevuBu Server Monitoring"**
3. Click to open it
4. You should see panels for:
   - Request Rate
   - Response Time  
   - Error Rate
   - Memory Usage

## 🎨 Exploring Metrics in Explore View

The **Explore** feature lets you query data interactively:

### Try These Queries:

**1. Request Rate:**
```
rate(randevubu_http_requests_total[5m])
```

**2. 95th Percentile Response Time:**
```
histogram_quantile(0.95, rate(randevubu_http_request_duration_seconds_bucket[5m]))
```

**3. Error Rate:**
```
rate(randevubu_http_requests_total{status=~"5.."}[5m])
```

**4. Total Requests (last hour):**
```
randevubu_http_requests_total
```

## 📊 Understanding Your Dashboard

Your pre-configured dashboard shows:

1. **Request Rate** - How many requests per second
2. **Response Time** - How fast your API responds (95th percentile)
3. **Error Rate** - 4xx and 5xx errors
4. **Memory Usage** - RAM consumption
5. **Active Connections** - Current HTTP connections

## 🔍 Tracing with RequestId

### In Grafana:

1. Click **"Explore"**
2. Select **Prometheus** data source
3. Query: Find requests with a specific requestId
   - This requires adding labels to your metrics

### In Terminal:

```bash
# Get request ID from API response
curl -I http://localhost:3001/api/v1/

# Look for: X-Request-ID: abc-123-def

# Then search in logs:
grep "abc-123-def" logs/all/*.log
```

## 🎯 Next Steps

1. **Make some API calls** to generate data
2. **Watch your dashboard** update in real-time
3. **Create custom panels** for metrics you care about
4. **Set up alerts** when things go wrong
5. **Explore Prometheus queries** in the Explore view

## 🆘 Troubleshooting

### No data in dashboard?
- Check Prometheus is collecting: http://localhost:9090/targets
- Check app is exposing metrics: http://localhost:3001/metrics
- Refresh the dashboard (F5)

### Can't see Prometheus in data sources?
- Go to: Configuration → Data sources → Add data source
- Select Prometheus
- URL: `http://prometheus:9090`
- Save & test

### Dashboard not showing panels?
- Make sure you made some API calls
- Check Prometheus has data: http://localhost:9090
- Query in Explore view to verify metrics exist

## 📚 Resources

- **Prometheus Queries**: https://prometheus.io/docs/prometheus/latest/querying/basics/
- **Grafana Dashboard Docs**: https://grafana.com/docs/grafana/latest/dashboards/
- **Explore Feature**: Click "Explore" and try different queries!







