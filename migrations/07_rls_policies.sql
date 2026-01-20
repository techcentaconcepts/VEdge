-- ==================================================================================
-- VANTEDGE MIGRATION 07: RLS POLICIES
-- ==================================================================================
-- Run AFTER 06_triggers.sql
-- ==================================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bankrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_clv_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.value_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odds_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proxy_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proxy_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_edge_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmaker_speed_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin users policies
DROP POLICY IF EXISTS "Users can check own admin status" ON public.admin_users;
CREATE POLICY "Users can check own admin status" ON public.admin_users
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can manage admin users" ON public.admin_users;
CREATE POLICY "Super admins can manage admin users" ON public.admin_users
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid() AND au.role = 'super_admin'));

-- Admin audit log policies
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit logs" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Site settings policies
DROP POLICY IF EXISTS "Admins can read site settings" ON public.site_settings;
CREATE POLICY "Admins can read site settings" ON public.site_settings
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

DROP POLICY IF EXISTS "Super admins can modify site settings" ON public.site_settings;
CREATE POLICY "Super admins can modify site settings" ON public.site_settings
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid() AND admin_users.role = 'super_admin'));

-- Payment gateways policies
DROP POLICY IF EXISTS "Admins can read payment gateways" ON public.payment_gateways;
CREATE POLICY "Admins can read payment gateways" ON public.payment_gateways
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

DROP POLICY IF EXISTS "Super admins can modify payment gateways" ON public.payment_gateways;
CREATE POLICY "Super admins can modify payment gateways" ON public.payment_gateways
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid() AND admin_users.role = 'super_admin'));

-- Subscription plans policies
DROP POLICY IF EXISTS "Public can read active plans" ON public.subscription_plans;
CREATE POLICY "Public can read active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Subscription events policies
DROP POLICY IF EXISTS "Admins can read subscription events" ON public.subscription_events;
CREATE POLICY "Admins can read subscription events" ON public.subscription_events
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Revenue daily policies
DROP POLICY IF EXISTS "Admins can read revenue" ON public.revenue_daily;
CREATE POLICY "Admins can read revenue" ON public.revenue_daily
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Bets policies
DROP POLICY IF EXISTS "Users can manage own bets" ON public.bets;
CREATE POLICY "Users can manage own bets" ON public.bets
  FOR ALL USING (auth.uid() = user_id);

-- Bankrolls policies
DROP POLICY IF EXISTS "Users can manage own bankrolls" ON public.bankrolls;
CREATE POLICY "Users can manage own bankrolls" ON public.bankrolls
  FOR ALL USING (auth.uid() = user_id);

-- User CLV daily policies
DROP POLICY IF EXISTS "Admins can view user CLV" ON public.user_clv_daily;
CREATE POLICY "Admins can view user CLV" ON public.user_clv_daily
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Alert log policies
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alert_log;
CREATE POLICY "Users can view own alerts" ON public.alert_log
  FOR SELECT USING (auth.uid() = user_id);

-- Value opportunities policies
DROP POLICY IF EXISTS "Public view opportunities" ON public.value_opportunities;
CREATE POLICY "Public view opportunities" ON public.value_opportunities
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage opportunities" ON public.value_opportunities;
CREATE POLICY "Admins can manage opportunities" ON public.value_opportunities
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

DROP POLICY IF EXISTS "Allow service upsert" ON public.value_opportunities;
CREATE POLICY "Allow service upsert" ON public.value_opportunities
  FOR ALL USING (auth.role() = 'service_role');

-- Odds snapshots policies
DROP POLICY IF EXISTS "Authenticated users can read odds snapshots" ON public.odds_snapshots;
CREATE POLICY "Authenticated users can read odds snapshots" ON public.odds_snapshots
  FOR SELECT TO authenticated USING (true);

-- Scraper health policies
DROP POLICY IF EXISTS "Admins can view scraper health" ON public.scraper_health;
CREATE POLICY "Admins can view scraper health" ON public.scraper_health
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Proxy pool policies
DROP POLICY IF EXISTS "Admins can manage proxy pool" ON public.proxy_pool;
CREATE POLICY "Admins can manage proxy pool" ON public.proxy_pool
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Proxy logs policies
DROP POLICY IF EXISTS "Admins can read proxy logs" ON public.proxy_logs;
CREATE POLICY "Admins can read proxy logs" ON public.proxy_logs
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Market edge stats policies
DROP POLICY IF EXISTS "Admins can view market edge stats" ON public.market_edge_stats;
CREATE POLICY "Admins can view market edge stats" ON public.market_edge_stats
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Bookmaker speed metrics policies
DROP POLICY IF EXISTS "Admins can read bookmaker speed" ON public.bookmaker_speed_metrics;
CREATE POLICY "Admins can read bookmaker speed" ON public.bookmaker_speed_metrics
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- System alerts policies
DROP POLICY IF EXISTS "Admins can manage system alerts" ON public.system_alerts;
CREATE POLICY "Admins can manage system alerts" ON public.system_alerts
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));
