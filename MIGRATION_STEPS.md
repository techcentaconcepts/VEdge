# Supabase Cron Migration - Manual Steps Required

## ✅ What's Been Done

1. **Code Changes:**
   - ✅ Removed Vercel cron configuration from `vercel.json`
   - ✅ Created Supabase Edge Function (`supabase/functions/scrape-odds/index.ts`)
   - ✅ Created SQL migration for pg_cron setup
   - ✅ Fixed TypeScript build (excluded Supabase functions)
   - ✅ Railway bridge is healthy and ready
   - ✅ All changes committed and pushed

2. **Deployments:**
   - ✅ Vercel build now succeeds
   - ✅ Railway bridge running successfully

---

## ⏳ Manual Steps You Need to Complete

### Step 1: Run SQL Migrations in Supabase

Go to **Supabase Dashboard → SQL Editor** and run these in order:

**1.1 Enable Extensions:**
```sql
-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enable http extension (alternative to pg_net)
CREATE EXTENSION IF NOT EXISTS http;

-- Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
```

**1.2 Run Value Opportunities Migration (if not already done):**
```sql
-- Copy entire contents from:
-- supabase/migrations/20260119_value_opportunities_upsert.sql
-- Then run it
```

**1.3 Setup Cron Job:**
```sql
-- Copy entire contents from:
-- supabase/migrations/20260119_setup_cron_scraping.sql
-- Then run it
```

**1.4 Configure Edge Function URL:**
```sql
-- Replace YOUR_PROJECT_REF with your actual Supabase project reference ID
ALTER DATABASE postgres 
SET app.edge_function_url TO 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scrape-odds';

-- Set cron secret (use a secure random string)
ALTER DATABASE postgres 
SET app.cron_secret TO 'your-secure-random-string-here';
```

**Get your PROJECT_REF:**
- Supabase Dashboard → Settings → General → Reference ID
- OR from your Project URL: `https://YOUR_PROJECT_REF.supabase.co`

---

### Step 2: Deploy Supabase Edge Function

**2.1 Install Supabase CLI (if not installed):**
```bash
npm install -g supabase
```

**2.2 Login to Supabase:**
```bash
supabase login
```

**2.3 Link Your Project:**
```bash
cd c:\Users\Admin\Documents\GitHub\Vantedge
supabase link --project-ref YOUR_PROJECT_REF
```

**2.4 Deploy the Edge Function:**
```bash
supabase functions deploy scrape-odds
```

**2.5 Set Environment Secrets:**
```bash
supabase secrets set BRIDGE_URL=https://vantedge-production.up.railway.app
supabase secrets set CRON_SECRET=your-secure-random-string-here
```

*(Use the same cron secret from Step 1.4)*

---

### Step 3: Verify Setup

**3.1 Check if cron job is scheduled:**
```sql
SELECT * FROM cron.job;
```

Expected output:
```
jobid | schedule    | command                           | active
------|-------------|-----------------------------------|-------
1     | */2 * * * * | SELECT trigger_odds_scraping();   | t
```

**3.2 Manually trigger the function (test):**
```sql
SELECT trigger_odds_scraping();
```

**3.3 Check Edge Function logs:**
- Supabase Dashboard → Edge Functions → scrape-odds → Logs

**3.4 View cron job history:**
```sql
SELECT 
  job_id,
  status,
  start_time,
  end_time,
  return_message
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

---

### Step 4: Monitor First Runs

**4.1 Wait 2 minutes for first automatic run**

**4.2 Check value_opportunities table:**
```sql
SELECT 
  match_id,
  match_name,
  soft_bookie,
  best_edge_percent,
  updated_at
FROM value_opportunities
ORDER BY updated_at DESC
LIMIT 10;
```

**4.3 Check for errors:**
```sql
SELECT 
  start_time,
  status,
  return_message
FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC;
```

---

## 🔧 Troubleshooting

### Issue: "extension pg_cron does not exist"

**Solution:** Enable it in Supabase Dashboard:
1. Database → Extensions
2. Search for "pg_cron"
3. Click Enable

### Issue: "function trigger_odds_scraping() does not exist"

**Solution:** Run the migration from `supabase/migrations/20260119_setup_cron_scraping.sql`

### Issue: "permission denied for schema cron"

**Solution:** Grant permissions:
```sql
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
```

### Issue: Edge Function not responding

**Solution:** 
1. Check if deployed: `supabase functions list`
2. Check logs: Supabase Dashboard → Edge Functions → scrape-odds → Logs
3. Test manually:
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/scrape-odds \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## 📊 Expected Behavior

Once setup is complete:

1. **Every 2 minutes:**
   - pg_cron triggers `trigger_odds_scraping()`
   - Function calls Supabase Edge Function
   - Edge Function calls Railway bridge
   - Railway bridge scrapes Nigerian bookmakers
   - Odds are upserted into `value_opportunities` table
   - Edges are auto-calculated

2. **You can monitor in real-time:**
```sql
-- Watch the table update
SELECT COUNT(*), MAX(updated_at) 
FROM value_opportunities;
```

3. **High-value bets are instantly available:**
```sql
SELECT * FROM value_opportunities
WHERE best_edge_percent >= 5.0
ORDER BY best_edge_percent DESC;
```

---

## 🎯 Quick Checklist

- [ ] Enable pg_cron extension
- [ ] Enable pg_net extension  
- [ ] Run value_opportunities migration
- [ ] Run cron setup migration
- [ ] Configure Edge Function URL in database
- [ ] Deploy Edge Function to Supabase
- [ ] Set BRIDGE_URL and CRON_SECRET secrets
- [ ] Verify cron job is scheduled
- [ ] Test manual trigger
- [ ] Wait for first automatic run
- [ ] Check value_opportunities table for data
- [ ] Monitor cron job history for errors

---

## 📝 Important Notes

1. **Free Tier Limits:** Supabase free tier allows pg_cron, but be mindful of:
   - Database compute hours
   - Edge Function invocations (500K/month free)
   - Bandwidth

2. **Adjust Frequency if Needed:**
   ```sql
   -- Change to every 5 minutes
   SELECT cron.unschedule('scrape-odds-every-2-minutes');
   SELECT cron.schedule(
     'scrape-odds-every-5-minutes',
     '*/5 * * * *',
     'SELECT trigger_odds_scraping();'
   );
   ```

3. **Stop Cron if Needed:**
   ```sql
   SELECT cron.unschedule('scrape-odds-every-2-minutes');
   ```

---

## ✅ Success Criteria

You'll know everything is working when:

1. `SELECT * FROM cron.job;` shows active job
2. `SELECT * FROM cron.job_run_details;` shows successful runs every 2 minutes
3. `value_opportunities` table has recent data (check `updated_at`)
4. Edge Function logs show successful scraping
5. No errors in `cron.job_run_details` where `status = 'failed'`

---

**Need Help?** Check [SUPABASE_CRON_SETUP.md](SUPABASE_CRON_SETUP.md) for detailed documentation.
