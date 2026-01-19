# Railway Deployment Setup Guide

## ✅ Current Status

**Fix Applied**: Missing Supabase client import added to `bridge/main.py` (commit d41a442)

Railway should now successfully deploy. The previous crash was caused by:
- ❌ Code referenced `supabase_client` but never imported it
- ✅ Fixed: Added Supabase import with graceful error handling

---

## 🔧 Required Environment Variables

Set these in your Railway project dashboard:

### 1. Supabase Configuration

```bash
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Where to find these:**
1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role (secret)** → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Important**: Use the `service_role` key (NOT the `anon` key) because the bridge needs to call RPC functions.

### 2. Optional Configuration

```bash
ALLOWED_ORIGINS=https://vantedge.vercel.app,http://localhost:3000
PORT=8000  # Railway sets this automatically, don't override
```

---

## 📋 Setup Steps

### Step 1: Set Environment Variables

1. Go to your Railway project: https://railway.app/project/YOUR_PROJECT_ID
2. Click on the **Variables** tab
3. Add the variables listed above
4. Railway will automatically redeploy

### Step 2: Verify Deployment

Wait 2-3 minutes for the build to complete, then test the endpoints:

**Health Check:**
```bash
curl https://vantedge-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "naija-bridge",
  "timestamp": "2026-01-19T...",
  "scraper_available": true
}
```

**Root Endpoint:**
```bash
curl https://vantedge-production.up.railway.app/
```

Expected response:
```json
{
  "service": "Vantedge Naija Bridge",
  "version": "1.0.0",
  "status": "operational",
  "endpoints": {
    "health": "/health",
    "bet9ja": "/api/odds/bet9ja/{league}",
    ...
  }
}
```

### Step 3: Test Scraping Endpoint

```bash
curl https://vantedge-production.up.railway.app/api/odds/sportybet/premierleague
```

This should return SportyBet odds data.

---

## 🔍 Checking Deployment Status

### Option 1: Railway Dashboard

1. Go to https://railway.app/project/YOUR_PROJECT_ID
2. Click on your service
3. Check the **Deployments** tab
4. Look for the latest deployment (commit d41a442)
5. Status should show: ✅ **Active**

### Option 2: View Logs

In Railway dashboard:
1. Click on your service
2. Go to **Deployments** tab
3. Click on the latest deployment
4. View real-time logs

**What to look for:**
```
✅ Supabase client initialized
✅ Using JSON API scraper (Direct Interception)
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**If Supabase credentials not set, you'll see:**
```
⚠️ Supabase credentials not configured
```
This is OK - the service will still run, just won't sync to database.

### Option 3: Command Line Test

```powershell
# Test health endpoint
Invoke-RestMethod -Uri "https://vantedge-production.up.railway.app/health"

# Test root endpoint
Invoke-RestMethod -Uri "https://vantedge-production.up.railway.app/"

# Test odds endpoint
Invoke-RestMethod -Uri "https://vantedge-production.up.railway.app/api/odds/sportybet/premierleague"
```

---

## 🐛 Troubleshooting

### Issue: Still failing healthcheck

**Check:**
1. Verify the deployment is using the latest commit (d41a442)
2. Check Railway logs for Python import errors
3. Ensure `requirements.txt` includes all dependencies

**Fix:**
```bash
# Trigger a manual redeploy in Railway dashboard
# Or push a small change to trigger rebuild
```

### Issue: Supabase sync not working

**Symptoms:**
- Service runs fine
- Odds data returned successfully
- But no data in Supabase `value_opportunities` table

**Fix:**
1. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Railway
2. Verify RPC function exists: Run `20260119_value_opportunities_upsert.sql` migration
3. Check logs for: `✅ Supabase client initialized`

### Issue: CORS errors from frontend

**Fix:**
Add your Vercel domain to `ALLOWED_ORIGINS`:
```bash
ALLOWED_ORIGINS=https://vantedge.vercel.app,https://vantedge-git-*.vercel.app,http://localhost:3000
```

---

## ✅ Success Checklist

- [ ] Latest commit (d41a442) deployed successfully
- [ ] Health check returns `{"status": "healthy"}`
- [ ] Root endpoint returns service info
- [ ] Supabase environment variables set
- [ ] Logs show "✅ Supabase client initialized"
- [ ] Test endpoint returns odds data
- [ ] Data appears in Supabase `value_opportunities` table

---

## 📊 Monitoring

### Expected Logs (Healthy Service)

```
✅ Using JSON API scraper (Direct Interception)
✅ Supabase client initialized
INFO:     Started server process [1]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### Expected Logs (Scraping Request)

```
INFO:     Scraping SportyBet premierleague (JSON API)
INFO:     ✅ Synced to Supabase: Arsenal_Chelsea_2026-01-19
INFO:     200 GET /api/odds/sportybet/premierleague
```

---

## 🚀 Next Steps

Once Railway is healthy:

1. **Set up Supabase Cron** (see `MIGRATION_STEPS.md`)
2. **Deploy Edge Function** for automated scraping
3. **Test end-to-end flow**: Cron → Edge Function → Railway → Supabase
4. **Monitor for 24 hours** to ensure stability

---

## 📞 Quick Reference

- **Railway Service**: https://vantedge-production.up.railway.app
- **Health Endpoint**: https://vantedge-production.up.railway.app/health
- **Logs**: Railway Dashboard → Deployments → View Logs
- **Environment Variables**: Railway Dashboard → Variables tab

