-- ==================================================================================
-- VANTEDGE MIGRATION 08: DEFAULT DATA
-- ==================================================================================
-- Run AFTER 07_rls_policies.sql
-- ==================================================================================

-- Payment gateways
INSERT INTO public.payment_gateways (provider, display_name, is_enabled, is_test_mode, supported_currencies, priority)
VALUES 
  ('stripe', 'Stripe', true, true, ARRAY['USD', 'EUR', 'GBP'], 1),
  ('paystack', 'Paystack', true, true, ARRAY['NGN', 'GHS', 'ZAR', 'KES'], 0),
  ('flutterwave', 'Flutterwave', false, true, ARRAY['NGN', 'GHS', 'ZAR', 'KES', 'USD'], 2)
ON CONFLICT (provider) DO NOTHING;

-- Subscription plans
INSERT INTO public.subscription_plans (slug, name, description, prices, features, limits, is_popular, sort_order, is_active)
VALUES 
  ('free', 'Free', 'Basic access to value betting opportunities', 
   '{"NGN": {"monthly": 0, "yearly": 0}, "USD": {"monthly": 0, "yearly": 0}}'::jsonb,
   '["3 opportunities per day", "5-minute delayed alerts", "Basic statistics"]'::jsonb,
   '{"daily_opportunities": 3, "alert_delay_minutes": 5}'::jsonb,
   false, 0, true),
  ('starter', 'Starter', 'More opportunities and faster alerts',
   '{"NGN": {"monthly": 5000, "yearly": 50000}, "USD": {"monthly": 5, "yearly": 50}}'::jsonb,
   '["10 opportunities per day", "2-minute delayed alerts", "Advanced statistics", "Email alerts"]'::jsonb,
   '{"daily_opportunities": 10, "alert_delay_minutes": 2}'::jsonb,
   false, 1, true),
  ('pro', 'Pro', 'Unlimited access with real-time alerts',
   '{"NGN": {"monthly": 15000, "yearly": 150000}, "USD": {"monthly": 15, "yearly": 150}}'::jsonb,
   '["Unlimited opportunities", "Real-time alerts", "All statistics", "Telegram & Email alerts", "API access", "Priority support"]'::jsonb,
   '{"daily_opportunities": -1, "alert_delay_minutes": 0}'::jsonb,
   true, 2, true),
  ('enterprise', 'Enterprise', 'Custom solutions for professionals',
   '{"NGN": {"monthly": 50000, "yearly": 500000}, "USD": {"monthly": 50, "yearly": 500}}'::jsonb,
   '["Everything in Pro", "Custom integrations", "Dedicated support", "White-label options"]'::jsonb,
   '{"daily_opportunities": -1, "alert_delay_minutes": 0}'::jsonb,
   false, 3, true)
ON CONFLICT (slug) DO NOTHING;

-- Site settings
INSERT INTO public.site_settings (key, value, description, is_sensitive)
VALUES 
  ('maintenance_mode', '{"enabled": false}'::jsonb, 'Enable/disable maintenance mode', false),
  ('min_edge_threshold', '{"value": 3}'::jsonb, 'Minimum edge percentage to show opportunities', false),
  ('supported_bookmakers', '{"list": ["bet9ja", "sportybet", "betking", "1xbet", "betway"]}'::jsonb, 'List of supported bookmakers', false),
  ('telegram_bot', '{"enabled": false, "bot_token": ""}'::jsonb, 'Telegram bot configuration', true),
  ('email_settings', '{"from_email": "alerts@vantedge.com", "reply_to": "support@vantedge.com"}'::jsonb, 'Email configuration', false)
ON CONFLICT (key) DO NOTHING;

-- Verify data inserted
SELECT 'payment_gateways' as table_name, COUNT(*) as row_count FROM payment_gateways
UNION ALL
SELECT 'subscription_plans', COUNT(*) FROM subscription_plans
UNION ALL
SELECT 'site_settings', COUNT(*) FROM site_settings;
