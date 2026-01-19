-- Fix scraper_health scraper_type constraint to allow python-bridge
-- This migration updates the allowed values for scraper_type to include 'python-bridge'

ALTER TABLE scraper_health DROP CONSTRAINT IF EXISTS scraper_health_scraper_type_check;

ALTER TABLE scraper_health ADD CONSTRAINT scraper_health_scraper_type_check 
  CHECK (scraper_type IN ('extension', 'manual', 'api', 'python-bridge'));
