-- ==================================================================================
-- VANTEDGE DATA MIGRATION - EXISTING CREDENTIALS
-- ==================================================================================
-- Run this AFTER completing the schema migrations (01-07)
-- This contains actual data from your old Supabase project
-- ==================================================================================

-- ==================================================================================
-- PAYMENT GATEWAYS (with your actual credentials)
-- ==================================================================================

INSERT INTO public.payment_gateways (provider, display_name, is_enabled, is_test_mode, credentials, supported_currencies, priority)
VALUES 
  ('paystack', 'Paystack', false, true, 
   '{"public_key": "admin@vantedge.io", "secret_key": "Admin@123456"}'::jsonb,
   ARRAY['NGN', 'GHS', 'ZAR', 'USD'], 1),
  ('flutterwave', 'Flutterwave', false, true, 
   '{}'::jsonb,
   ARRAY['NGN', 'GHS', 'KES', 'ZAR', 'USD', 'GBP', 'EUR'], 2),
  ('stripe', 'Stripe', false, true, 
   '{}'::jsonb,
   ARRAY['USD', 'GBP', 'EUR', 'NGN'], 3)
ON CONFLICT (provider) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  is_enabled = EXCLUDED.is_enabled,
  is_test_mode = EXCLUDED.is_test_mode,
  credentials = EXCLUDED.credentials,
  supported_currencies = EXCLUDED.supported_currencies,
  priority = EXCLUDED.priority;


-- ==================================================================================
-- SITE SETTINGS (your actual configuration)
-- ==================================================================================

INSERT INTO public.site_settings (key, value, description, is_sensitive)
VALUES 
  ('site_name', '"Vantedge"'::jsonb, 'Site name displayed across the app', false),
  ('site_description', '"AI-powered betting analytics for Nigerian punters"'::jsonb, 'Site tagline/description', false),
  ('maintenance_mode', 'false'::jsonb, 'Enable maintenance mode to block user access', false),
  ('default_currency', '"NGN"'::jsonb, 'Default currency for new users', false),
  ('supported_currencies', '["NGN", "USD", "GBP", "EUR"]'::jsonb, 'List of supported currencies', false)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  is_sensitive = EXCLUDED.is_sensitive;


-- ==================================================================================
-- SUBSCRIPTION PLANS (your actual pricing)
-- ==================================================================================

-- Clear existing plans first
DELETE FROM public.subscription_plans;

INSERT INTO public.subscription_plans (slug, name, description, prices, features, limits, is_popular, sort_order, is_active)
VALUES 
  ('free', 'Explorer', 'Perfect for tracking your bets',
   '{"NGN": {"yearly": 0, "monthly": 0}, "USD": {"yearly": 0, "monthly": 0}}'::jsonb,
   '["Unlimited bet tracking", "Basic ROI & CLV stats", "Browser extension sync", "5-minute delayed odds"]'::jsonb,
   '{"max_bets": -1, "api_access": false, "history_days": 7, "max_alerts_per_day": 0, "telegram_notifications": false}'::jsonb,
   false, 1, true),
   
  ('starter', 'Starter', 'For serious side-hustlers',
   '{"NGN": {"yearly": 150000, "monthly": 15000}, "USD": {"yearly": 100, "monthly": 10}}'::jsonb,
   '["Everything in Explorer", "Real-time value alerts", "Telegram notifications", "Full analytics dashboard", "CLV tracking & metrics", "150 alerts/day", "30-day history"]'::jsonb,
   '{"api_access": false, "clv_tracking": true, "history_days": 30, "proxy_access": false, "extension_sync": true, "dedicated_proxies": 0, "max_alerts_per_day": 150, "max_bets_per_month": -1, "telegram_notifications": true}'::jsonb,
   false, 2, true),
   
  ('pro', 'Pro', 'For career bettors',
   '{"NGN": {"yearly": 750000, "monthly": 75000}, "USD": {"yearly": 490, "monthly": 49}}'::jsonb,
   '["Everything in Starter", "Stealth Suite access", "10 dedicated proxy IPs", "Mug bet scheduler", "Unlimited alerts", "Unlimited history", "API access", "Priority support"]'::jsonb,
   '{"api_access": true, "clv_tracking": true, "history_days": -1, "proxy_access": true, "extension_sync": true, "dedicated_proxies": 10, "max_alerts_per_day": -1, "max_bets_per_month": -1, "telegram_notifications": true}'::jsonb,
   true, 3, true),
   
  ('custom_pro', 'Custom Pro', null,
   '{}'::jsonb,
   '["All Pro Features", "Custom Configuration", "Admin Access", "Unlimited Limits", "Stealth Mode"]'::jsonb,
   '{"clv_tracking": true, "history_days": 30, "extension_sync": true, "max_alerts_per_day": -1, "max_bets_per_month": -1}'::jsonb,
   false, 0, true);


-- ==================================================================================
-- ADMIN USER
-- ==================================================================================
-- NOTE: You need to create a user first, then run this with the actual UUID
-- The old admin user UUID was: 10b61954-12ff-4b76-9f5c-e9720cb06a8f
-- After signing up on the new project, run:
--
-- INSERT INTO admin_users (user_id, role, permissions) 
-- VALUES ('YOUR_NEW_USER_UUID', 'super_admin', '["read"]'::jsonb);
--


-- ==================================================================================
-- VERIFY DATA
-- ==================================================================================

SELECT 'payment_gateways' as table_name, COUNT(*) as rows FROM payment_gateways
UNION ALL SELECT 'site_settings', COUNT(*) FROM site_settings
UNION ALL SELECT 'subscription_plans', COUNT(*) FROM subscription_plans;
