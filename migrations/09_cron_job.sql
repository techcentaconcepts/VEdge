-- ==================================================================================
-- VANTEDGE MIGRATION 09: CRON JOB
-- ==================================================================================
-- Run LAST after all other migrations
-- 
-- IMPORTANT: Before running this script:
-- 1. Replace YOUR_NEW_PROJECT_ID with your Supabase project ID
-- 2. Replace YOUR_SERVICE_ROLE_KEY with your service role key
-- 3. Deploy the scrape-odds Edge Function first
-- ==================================================================================

-- Create the trigger function for odds scraping
CREATE OR REPLACE FUNCTION public.trigger_odds_scraping()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the Edge Function using pg_net extension
  -- UPDATE THESE VALUES WITH YOUR NEW PROJECT!
  PERFORM
    net.http_post(
      url := 'https://YOUR_NEW_PROJECT_ID.supabase.co/functions/v1/scrape-odds',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body := '{}'::jsonb
    );
    
  RAISE NOTICE 'Triggered odds scraping at %', NOW();
END;
$$;

-- Remove existing cron job if it exists
SELECT cron.unschedule('trigger-odds-scraping') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'trigger-odds-scraping'
);

-- Schedule scraping every 2 minutes
SELECT cron.schedule(
  'trigger-odds-scraping',
  '*/2 * * * *',
  $$SELECT trigger_odds_scraping();$$
);

-- Verify cron job created
SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname = 'trigger-odds-scraping';
