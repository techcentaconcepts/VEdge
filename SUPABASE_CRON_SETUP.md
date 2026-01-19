# Supabase Cron Job Setup for Odds Scraping

## Why Supabase Instead of Vercel?

- ✅ **Free Tier**: Supabase allows frequent cron jobs on free tier
- ✅ **pg_cron**: Built-in PostgreSQL cron scheduler
- ✅ **No Limits**: Run every 2 minutes without upgrading
- ❌ **Vercel**: Hobby plan limited to daily cron jobs only

---

## Setup Guide

### Step 1: Deploy Supabase Edge Function

1. Install Supabase CLI (if not installed):
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

4. Deploy the Edge Function:
```bash
supabase functions deploy scrape-odds
```

5. Set environment variables for the function:
```bash
supabase secrets set BRIDGE_URL=https://vantedge-production.up.railway.app
supabase secrets set CRON_SECRET=your-secure-random-string
```

**Get your project ref**: Supabase Dashboard → Settings → General → Reference ID

---

### Step 2: Enable pg_cron Extension

1. Go to Supabase Dashboard → **Database** → **Extensions**
2. Search for `pg_cron`
3. Click **Enable**

OR run in SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

---

### Step 3: Enable pg_net Extension (for HTTP calls)

pg_cron needs pg_net to make HTTP requests to your Edge Function.

1. Go to Supabase Dashboard → **Database** → **Extensions**
2. Search for `pg_net`
3. Click **Enable**

OR run in SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

---

### Step 4: Setup Database Configuration

Run this in Supabase SQL Editor:

```sql
-- Set Edge Function URL (replace with your actual URL)
ALTER DATABASE postgres SET app.edge_function_url TO 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scrape-odds';

-- Set cron secret (same as in Edge Function secrets)
ALTER DATABASE postgres SET app.cron_secret TO 'your-secure-random-string';
```

**Get your Edge Function URL:**
- Format: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/scrape-odds`
- Find PROJECT_REF in: Dashboard → Settings → API → Project URL

---

### Step 5: Run the Cron Setup Migration

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy and paste contents of `supabase/migrations/20260119_setup_cron_scraping.sql`
4. Click **Run**

This will:
- Create `trigger_odds_scraping()` function
- Schedule cron job to run every 2 minutes
- Set up proper permissions

---

### Step 6: Verify Setup

**Check if cron job is scheduled:**
```sql
SELECT * FROM cron.job;
```

Expected output:
```
jobid | schedule    | command                           | active
------|-------------|-----------------------------------|-------
1     | */2 * * * * | SELECT trigger_odds_scraping();   | t
```

**Manually trigger the function (for testing):**
```sql
SELECT trigger_odds_scraping();
```

**View cron job history:**
```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

---

## How It Works

```
┌─────────────┐
│  pg_cron    │ Every 2 minutes
│  (Postgres) │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ trigger_odds_       │
│ scraping()          │ Calls Edge Function via HTTP
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Supabase Edge       │
│ Function            │ Scrapes Railway Bridge
│ (scrape-odds)       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Railway Bridge      │
│ (FastAPI)           │ Scrapes Nigerian bookmakers
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ value_opportunities │
│ table               │ Auto-upserts with edges
└─────────────────────┘
```

---

## Customization

### Change Schedule Frequency

Edit the cron expression in SQL:

**Every 5 minutes:**
```sql
SELECT cron.schedule(
  'scrape-odds-every-5-minutes',
  '*/5 * * * *',
  'SELECT trigger_odds_scraping();'
);
```

**Every 10 minutes:**
```sql
SELECT cron.schedule(
  'scrape-odds-every-10-minutes',
  '*/10 * * * *',
  'SELECT trigger_odds_scraping();'
);
```

**Every hour:**
```sql
SELECT cron.schedule(
  'scrape-odds-hourly',
  '0 * * * *',
  'SELECT trigger_odds_scraping();'
);
```

### Stop/Restart Cron Job

**Unschedule (stop):**
```sql
SELECT cron.unschedule('scrape-odds-every-2-minutes');
```

**Re-schedule (start):**
```sql
SELECT cron.schedule(
  'scrape-odds-every-2-minutes',
  '*/2 * * * *',
  'SELECT trigger_odds_scraping();'
);
```

---

## Monitoring

### View Recent Runs

```sql
SELECT 
  job_id,
  status,
  start_time,
  end_time,
  (end_time - start_time) as duration
FROM cron.job_run_details
WHERE job_id = (SELECT jobid FROM cron.job WHERE jobname = 'scrape-odds-every-2-minutes')
ORDER BY start_time DESC
LIMIT 20;
```

### Check for Errors

```sql
SELECT 
  start_time,
  status,
  return_message
FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC
LIMIT 10;
```

### Edge Function Logs

1. Go to Supabase Dashboard → **Edge Functions**
2. Click on `scrape-odds` function
3. View **Logs** tab

---

## Troubleshooting

### Issue: Cron job not running

**Check if pg_cron is enabled:**
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

**Check if job is active:**
```sql
SELECT * FROM cron.job WHERE active = true;
```

### Issue: HTTP request fails

**Check if pg_net is enabled:**
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

**Test Edge Function manually:**
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/scrape-odds \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Issue: "permission denied for schema cron"

**Grant permissions:**
```sql
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
```

---

## Alternative: Supabase Database Webhooks

If pg_cron doesn't work, you can use **Database Webhooks** instead:

1. Create a webhook that triggers on `value_opportunities` table inserts
2. Configure it to call your Railway bridge directly
3. Set up a recurring insert (e.g., via another service like cron-job.org)

**Setup:**
```sql
CREATE OR REPLACE FUNCTION notify_scrape()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://vantedge-production.up.railway.app/api/odds/all/premierleague',
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scrape
AFTER INSERT ON scrape_schedule
FOR EACH ROW
EXECUTE FUNCTION notify_scrape();
```

---

## Cost Comparison

| Service | Free Tier Limit | Cost for Every 2 Min |
|---------|----------------|---------------------|
| **Vercel** | Daily cron only | $20/month (Pro plan) |
| **Supabase** | Unlimited cron | **FREE** ✅ |
| Railway | No native cron | External service needed |

---

## Next Steps

1. ✅ Deploy Edge Function to Supabase
2. ✅ Enable pg_cron extension
3. ✅ Run cron setup migration
4. ✅ Test manual trigger
5. ✅ Monitor first scheduled runs
6. ⏳ Remove Vercel cron job (if exists)

---

## Files Created

- `supabase/functions/scrape-odds/index.ts` - Edge Function code
- `supabase/migrations/20260119_setup_cron_scraping.sql` - Database setup
- `SUPABASE_CRON_SETUP.md` - This guide

---

**Recommendation:** Start with every 5 minutes (`*/5 * * * *`) to avoid overwhelming your Railway bridge service, then adjust based on monitoring.
