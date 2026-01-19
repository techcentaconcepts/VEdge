# Manual Deployment Steps (Windows PowerShell)

## Step 1: Install Supabase CLI

```powershell
npm install -g supabase
```

## Step 2: Login and Link Project

```powershell
supabase login
supabase link --project-ref ywygmsjrqrjogzujutfv
```

## Step 3: Deploy Edge Function

```powershell
supabase functions deploy scrape-odds
```

## Step 4: Set Environment Variables

```powershell
supabase secrets set BRIDGE_URL=https://vantedge-production.up.railway.app
supabase secrets set CRON_SECRET=your-secure-random-string
```

## Step 5: Enable Database Extensions

Go to Supabase Dashboard → Database → Extensions:

1. Search for `pg_cron` → Click **Enable**
2. Search for `pg_net` → Click **Enable**

## Step 6: Run SQL Migration

Go to Supabase Dashboard → SQL Editor → New Query

Copy and paste this SQL:

```sql
-- Enable extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Set configuration variables
ALTER DATABASE postgres SET app.edge_function_url TO 'https://ywygmsjrqrjogzujutfv.supabase.co/functions/v1/scrape-odds';
ALTER DATABASE postgres SET app.cron_secret TO 'your-secure-random-string';

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_odds_scraping()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT;
  cron_secret TEXT;
BEGIN
  edge_function_url := current_setting('app.edge_function_url', true);
  cron_secret := current_setting('app.cron_secret', true);
  
  IF edge_function_url IS NULL THEN
    edge_function_url := 'https://ywygmsjrqrjogzujutfv.supabase.co/functions/v1/scrape-odds';
  END IF;

  PERFORM
    net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(cron_secret, '')
      ),
      body := '{}'::jsonb
    );
    
  RAISE NOTICE 'Triggered odds scraping at %', NOW();
END;
$$;

-- Schedule cron job (every 5 minutes)
SELECT cron.schedule(
  'scrape-odds-every-5-minutes',
  '*/5 * * * *',
  'SELECT trigger_odds_scraping();'
);

-- Verify
SELECT * FROM cron.job;
```

Click **Run**

## Step 7: Test

### Test Edge Function Directly

```powershell
curl -X POST https://ywygmsjrqrjogzujutfv.supabase.co/functions/v1/scrape-odds `
  -H "Authorization: Bearer YOUR_ANON_KEY" `
  -H "Content-Type: application/json"
```

### Manually Trigger Cron (in SQL Editor)

```sql
SELECT trigger_odds_scraping();
```

### View Cron Jobs

```sql
SELECT * FROM cron.job;
```

### View Cron History

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

## Step 8: Monitor

Go to: Supabase Dashboard → Edge Functions → scrape-odds → **Logs**

You should see:
- Function invocations every 5 minutes
- Success/error logs
- Scraped matches count

## Troubleshooting

### Issue: "extension pg_cron does not exist"

Enable it manually:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Issue: "extension pg_net does not exist"

Enable it manually:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Issue: Cron not triggering

Check if job is active:
```sql
SELECT * FROM cron.job WHERE active = true;
```

Unschedule and reschedule:
```sql
SELECT cron.unschedule('scrape-odds-every-5-minutes');
SELECT cron.schedule(
  'scrape-odds-every-5-minutes',
  '*/5 * * * *',
  'SELECT trigger_odds_scraping();'
);
```

## Cleanup Old Vercel Cron

The Vercel cron configuration has been removed from `vercel.json`.

The disabled API route at `/api/cron/scrape-odds` will return:
```json
{
  "success": true,
  "message": "Cron scraping temporarily disabled. Use FastAPI bridge service endpoints.",
  "note": "Configure Railway bridge to run on schedule instead"
}
```

No further cleanup needed on Vercel side.
