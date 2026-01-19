-- Setup pg_cron for automated odds scraping
-- This will call the Supabase Edge Function every 2 minutes

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permissions to run cron jobs
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create function to trigger Edge Function via HTTP
CREATE OR REPLACE FUNCTION trigger_odds_scraping()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT;
  cron_secret TEXT;
  response TEXT;
BEGIN
  -- Get Edge Function URL from environment
  -- Replace this with your actual Supabase Edge Function URL
  edge_function_url := current_setting('app.edge_function_url', true);
  cron_secret := current_setting('app.cron_secret', true);
  
  -- If not set, use default
  IF edge_function_url IS NULL THEN
    edge_function_url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scrape-odds';
  END IF;

  -- Call the Edge Function using pg_net extension
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

-- Schedule the cron job to run every 2 minutes
-- Note: pg_cron uses standard cron syntax
SELECT cron.schedule(
  'scrape-odds-every-2-minutes',  -- Job name
  '*/2 * * * *',                   -- Every 2 minutes
  'SELECT trigger_odds_scraping();'
);

-- Alternative: Run every 5 minutes (less aggressive)
-- SELECT cron.schedule(
--   'scrape-odds-every-5-minutes',
--   '*/5 * * * *',
--   'SELECT trigger_odds_scraping();'
-- );

-- View scheduled cron jobs
SELECT * FROM cron.job;

-- To unschedule a job (if needed):
-- SELECT cron.unschedule('scrape-odds-every-2-minutes');

COMMENT ON FUNCTION trigger_odds_scraping IS 'Triggers the Supabase Edge Function to scrape odds from Nigerian bookmakers';
