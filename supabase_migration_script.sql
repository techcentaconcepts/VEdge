-- ==================================================================================
-- VANTEDGE DATABASE MIGRATION SCRIPT
-- ==================================================================================
-- Generated: January 20, 2026
-- Source Project: 
-- 
-- INSTRUCTIONS:
-- 1. Create a new Supabase project
-- 2. Run this script in the SQL Editor or as a migration
-- 3. Update your .env.local with the new project URL and keys
-- 4. Deploy Edge Functions separately
-- 5. Update the trigger_odds_scraping function with the new project URL
-- ==================================================================================

-- ==================================================================================
-- PART 1: ENABLE EXTENSIONS
-- ==================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA graphql;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA vault;

-- ==================================================================================
-- PART 2: CREATE TABLES (in dependency order)
-- ==================================================================================

-- Profiles table (depends on auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    subscription_tier TEXT DEFAULT 'free' NOT NULL,
    telegram_chat_id BIGINT UNIQUE,
    telegram_username TEXT,
    stripe_customer_id TEXT UNIQUE,
    paystack_customer_code TEXT UNIQUE,
    alert_preferences JSONB DEFAULT '{"sports": ["football"], "enabled": true, "min_edge": 5}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admin users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'admin' NOT NULL CHECK (role = ANY (ARRAY['admin', 'super_admin'])),
    permissions JSONB DEFAULT '["read"]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES public.admin_users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Site settings
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB DEFAULT '{}'::jsonb NOT NULL,
    description TEXT,
    is_sensitive BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Payment gateways
CREATE TABLE IF NOT EXISTS public.payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT UNIQUE NOT NULL CHECK (provider = ANY (ARRAY['stripe', 'paystack', 'flutterwave'])),
    display_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    is_test_mode BOOLEAN DEFAULT true,
    credentials JSONB DEFAULT '{}'::jsonb,
    supported_currencies TEXT[] DEFAULT ARRAY['NGN'],
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subscription plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    is_popular BOOLEAN DEFAULT false,
    trial_days INTEGER DEFAULT 0,
    prices JSONB DEFAULT '{}'::jsonb,
    limits JSONB DEFAULT '{}'::jsonb,
    sort_order INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier = ANY (ARRAY['free', 'starter', 'pro'])),
    payment_provider TEXT CHECK (payment_provider = ANY (ARRAY['stripe', 'paystack'])),
    external_subscription_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status = ANY (ARRAY['active', 'past_due', 'canceled', 'trialing'])),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subscription events
CREATE TABLE IF NOT EXISTS public.subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type = ANY (ARRAY['trial_started', 'trial_ended', 'subscribed', 'upgraded', 'downgraded', 'canceled', 'reactivated', 'payment_failed', 'payment_succeeded', 'gifted', 'refunded'])),
    from_tier TEXT,
    to_tier TEXT,
    payment_provider TEXT,
    amount NUMERIC,
    currency TEXT DEFAULT 'NGN',
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Revenue daily
CREATE TABLE IF NOT EXISTS public.revenue_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,
    new_subscriptions INTEGER DEFAULT 0,
    churned_subscriptions INTEGER DEFAULT 0,
    upgrades INTEGER DEFAULT 0,
    downgrades INTEGER DEFAULT 0,
    mrr_ngn NUMERIC DEFAULT 0,
    mrr_usd NUMERIC DEFAULT 0,
    total_revenue_ngn NUMERIC DEFAULT 0,
    total_revenue_usd NUMERIC DEFAULT 0,
    refunds_ngn NUMERIC DEFAULT 0,
    refunds_usd NUMERIC DEFAULT 0,
    active_subscribers INTEGER DEFAULT 0,
    trial_users INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Bets
CREATE TABLE IF NOT EXISTS public.bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    external_bet_id TEXT,
    bookmaker TEXT NOT NULL,
    sport TEXT NOT NULL,
    league TEXT,
    match_name TEXT NOT NULL,
    market TEXT NOT NULL,
    selection TEXT NOT NULL,
    odds NUMERIC NOT NULL,
    stake NUMERIC NOT NULL,
    currency TEXT DEFAULT 'NGN' NOT NULL,
    potential_return NUMERIC GENERATED ALWAYS AS (stake * odds) STORED,
    outcome TEXT CHECK (outcome = ANY (ARRAY['pending', 'won', 'lost', 'void', 'cashout'])),
    profit_loss NUMERIC,
    closing_odds NUMERIC,
    clv_percent NUMERIC,
    placed_at TIMESTAMPTZ NOT NULL,
    settled_at TIMESTAMPTZ,
    synced_from TEXT CHECK (synced_from = ANY (ARRAY['extension', 'manual', 'api'])),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, external_bet_id, bookmaker)
);

-- Bankrolls
CREATE TABLE IF NOT EXISTS public.bankrolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bookmaker TEXT NOT NULL,
    currency TEXT DEFAULT 'NGN' NOT NULL,
    balance NUMERIC DEFAULT 0 NOT NULL,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, bookmaker)
);

-- User CLV daily
CREATE TABLE IF NOT EXISTS public.user_clv_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    bets_placed INTEGER DEFAULT 0,
    total_staked NUMERIC DEFAULT 0,
    avg_clv_percent NUMERIC,
    positive_clv_bets INTEGER DEFAULT 0,
    total_edge_captured NUMERIC,
    win_rate NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, date)
);

-- Alert log
CREATE TABLE IF NOT EXISTS public.alert_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    opportunity_id UUID,
    channel TEXT NOT NULL CHECK (channel = ANY (ARRAY['telegram', 'email', 'push'])),
    status TEXT NOT NULL CHECK (status = ANY (ARRAY['sent', 'delivered', 'failed', 'clicked'])),
    sent_at TIMESTAMPTZ DEFAULT now(),
    delivered_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ
);

-- Value opportunities
CREATE TABLE IF NOT EXISTS public.value_opportunities (
    match_id TEXT PRIMARY KEY,
    match_name TEXT NOT NULL,
    league_name TEXT,
    kickoff_time TIMESTAMPTZ,
    sharp_bookie TEXT DEFAULT 'Pinnacle',
    sharp_odds_home NUMERIC,
    sharp_odds_draw NUMERIC,
    sharp_odds_away NUMERIC,
    soft_bookie TEXT,
    soft_odds_home NUMERIC,
    soft_odds_draw NUMERIC,
    soft_odds_away NUMERIC,
    edge_home_percent NUMERIC,
    edge_draw_percent NUMERIC,
    edge_away_percent NUMERIC,
    best_edge_percent NUMERIC,
    best_edge_market TEXT,
    is_alerted BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Odds snapshots
CREATE TABLE IF NOT EXISTS public.odds_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id TEXT NOT NULL,
    match_name TEXT NOT NULL,
    sport TEXT NOT NULL,
    league TEXT,
    kickoff_time TIMESTAMPTZ NOT NULL,
    bookmaker TEXT NOT NULL,
    market TEXT NOT NULL,
    selection TEXT NOT NULL,
    odds NUMERIC NOT NULL,
    is_sharp BOOLEAN DEFAULT false NOT NULL,
    scraped_at TIMESTAMPTZ DEFAULT now()
);

-- Scraper health
CREATE TABLE IF NOT EXISTS public.scraper_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bookmaker TEXT NOT NULL,
    scraper_type TEXT NOT NULL CHECK (scraper_type = ANY (ARRAY['extension', 'manual', 'api', 'python-bridge'])),
    status TEXT NOT NULL CHECK (status = ANY (ARRAY['healthy', 'degraded', 'down', 'maintenance'])),
    latency_ms INTEGER,
    success_rate NUMERIC,
    last_successful_scrape TIMESTAMPTZ,
    error_message TEXT,
    error_count INTEGER DEFAULT 0,
    records_scraped INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Proxy pool
CREATE TABLE IF NOT EXISTS public.proxy_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT DEFAULT 'techcenta' NOT NULL,
    ip_address TEXT NOT NULL,
    port INTEGER NOT NULL,
    country_code TEXT DEFAULT 'NG',
    region TEXT,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status = ANY (ARRAY['active', 'banned', 'cooling', 'retired'])),
    success_count INTEGER DEFAULT 0,
    fail_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    last_banned_at TIMESTAMPTZ,
    cooldown_until TIMESTAMPTZ,
    assigned_bookmaker TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(ip_address, port)
);

-- Proxy logs
CREATE TABLE IF NOT EXISTS public.proxy_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proxy_id UUID REFERENCES public.proxy_pool(id),
    bookmaker TEXT NOT NULL,
    request_url TEXT,
    response_code INTEGER,
    latency_ms INTEGER,
    was_blocked BOOLEAN DEFAULT false,
    error_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Market edge stats
CREATE TABLE IF NOT EXISTS public.market_edge_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    sport TEXT NOT NULL,
    league TEXT NOT NULL,
    market_type TEXT NOT NULL,
    soft_bookmaker TEXT NOT NULL,
    opportunities_found INTEGER DEFAULT 0,
    avg_edge_percent NUMERIC,
    max_edge_percent NUMERIC,
    hit_rate NUMERIC,
    total_volume NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(date, sport, league, market_type, soft_bookmaker)
);

-- Bookmaker speed metrics
CREATE TABLE IF NOT EXISTS public.bookmaker_speed_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    bookmaker TEXT NOT NULL,
    avg_reaction_time_sec NUMERIC,
    odds_changes_tracked INTEGER,
    delayed_updates INTEGER,
    market_coverage_pct NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(date, bookmaker)
);

-- System alerts
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    severity TEXT NOT NULL CHECK (severity = ANY (ARRAY['info', 'warning', 'error', 'critical'])),
    category TEXT NOT NULL CHECK (category = ANY (ARRAY['scraper', 'proxy', 'payment', 'security', 'performance'])),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.admin_users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- ==================================================================================
-- PART 3: CREATE INDEXES
-- ==================================================================================

-- Admin audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_admin ON public.admin_audit_log(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON public.admin_audit_log(resource_type, resource_id);

-- Alert log indexes
CREATE INDEX IF NOT EXISTS idx_alerts_user ON public.alert_log(user_id, sent_at DESC);

-- Bankrolls indexes
CREATE INDEX IF NOT EXISTS idx_bankrolls_user ON public.bankrolls(user_id);

-- Bets indexes
CREATE INDEX IF NOT EXISTS idx_bets_user_bookmaker ON public.bets(user_id, bookmaker);
CREATE INDEX IF NOT EXISTS idx_bets_user_date ON public.bets(user_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_outcome ON public.bets(outcome) WHERE outcome = 'pending';

-- Bookmaker speed metrics indexes
CREATE INDEX IF NOT EXISTS idx_bookmaker_speed_date ON public.bookmaker_speed_metrics(date DESC);

-- Market edge stats indexes
CREATE INDEX IF NOT EXISTS idx_market_edge_date ON public.market_edge_stats(date DESC, sport);

-- Odds snapshots indexes
CREATE INDEX IF NOT EXISTS idx_odds_bookmaker ON public.odds_snapshots(bookmaker, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_odds_match_time ON public.odds_snapshots(match_id, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_odds_sharp ON public.odds_snapshots(is_sharp, scraped_at DESC) WHERE is_sharp = true;

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_telegram ON public.profiles(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON public.profiles(subscription_tier);

-- Proxy logs indexes
CREATE INDEX IF NOT EXISTS idx_proxy_logs_time ON public.proxy_logs(proxy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proxy_logs_blocks ON public.proxy_logs(was_blocked, created_at DESC) WHERE was_blocked = true;

-- Proxy pool indexes
CREATE INDEX IF NOT EXISTS idx_proxy_status ON public.proxy_pool(status, assigned_bookmaker);

-- Scraper health indexes
CREATE INDEX IF NOT EXISTS idx_scraper_health_time ON public.scraper_health(bookmaker, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_health_status ON public.scraper_health(status, created_at DESC);

-- Subscription events indexes
CREATE INDEX IF NOT EXISTS idx_sub_events_user ON public.subscription_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_events_type ON public.subscription_events(event_type, created_at DESC);

-- System alerts indexes
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON public.system_alerts(is_resolved, severity, created_at DESC) WHERE is_resolved = false;

-- User CLV daily indexes
CREATE INDEX IF NOT EXISTS idx_user_clv_user ON public.user_clv_daily(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_clv_top ON public.user_clv_daily(date, avg_clv_percent DESC);

-- Value opportunities indexes
CREATE INDEX IF NOT EXISTS idx_value_opps_edge ON public.value_opportunities(best_edge_percent DESC) WHERE best_edge_percent >= 3.0;
CREATE INDEX IF NOT EXISTS idx_value_opps_kickoff ON public.value_opportunities(kickoff_time);
CREATE INDEX IF NOT EXISTS idx_value_opps_updated ON public.value_opportunities(updated_at DESC);


-- ==================================================================================
-- PART 4: CREATE FUNCTIONS
-- ==================================================================================

-- Update updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Calculate CLV trigger function
CREATE OR REPLACE FUNCTION public.calculate_clv()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.closing_odds IS NOT NULL AND NEW.odds IS NOT NULL THEN
    NEW.clv_percent = ((NEW.odds / NEW.closing_odds) - 1) * 100;
  END IF;
  RETURN NEW;
END;
$$;

-- Handle new user function (creates profile on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Is admin check function
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = p_user_id
  );
END;
$$;

-- Is super admin check function
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = p_user_id AND role = 'super_admin'
  );
END;
$$;

-- Is user admin function
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS TABLE(is_admin boolean, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as is_admin,
    admin_users.role
  FROM admin_users
  WHERE admin_users.user_id = auth.uid()
  LIMIT 1;
END;
$$;

-- Calculate user stats function
CREATE OR REPLACE FUNCTION public.calculate_user_stats(p_user_id uuid)
RETURNS TABLE(
  total_bets bigint, 
  total_staked numeric, 
  total_profit numeric, 
  roi numeric, 
  win_rate numeric, 
  avg_clv numeric, 
  avg_odds numeric, 
  pending_count bigint, 
  won_count bigint, 
  lost_count bigint, 
  last_bet_date timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_bets,
    COALESCE(SUM(stake), 0)::DECIMAL as total_staked,
    COALESCE(SUM(profit_loss), 0)::DECIMAL as total_profit,
    CASE 
      WHEN SUM(stake) > 0 THEN 
        (SUM(profit_loss) / SUM(stake) * 100)::DECIMAL
      ELSE 0
    END as roi,
    CASE 
      WHEN COUNT(*) FILTER (WHERE outcome IN ('won', 'lost')) > 0 THEN
        (COUNT(*) FILTER (WHERE outcome = 'won')::DECIMAL / 
         COUNT(*) FILTER (WHERE outcome IN ('won', 'lost')) * 100)::DECIMAL
      ELSE 0
    END as win_rate,
    COALESCE(AVG(clv_percent) FILTER (WHERE clv_percent IS NOT NULL), 0)::DECIMAL as avg_clv,
    COALESCE(AVG(odds), 0)::DECIMAL as avg_odds,
    COUNT(*) FILTER (WHERE outcome = 'pending')::BIGINT as pending_count,
    COUNT(*) FILTER (WHERE outcome = 'won')::BIGINT as won_count,
    COUNT(*) FILTER (WHERE outcome = 'lost')::BIGINT as lost_count,
    MAX(placed_at) as last_bet_date
  FROM bets
  WHERE bets.user_id = p_user_id;
END;
$$;

-- Cleanup stale odds function
CREATE OR REPLACE FUNCTION public.cleanup_stale_odds()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.value_opportunities
    WHERE updated_at < NOW() - INTERVAL '10 minutes';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Get scraper summary function
CREATE OR REPLACE FUNCTION public.get_scraper_summary()
RETURNS TABLE(
  bookmaker text, 
  status text, 
  avg_latency_ms numeric, 
  success_rate numeric, 
  last_check timestamp with time zone, 
  error_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH latest AS (
    SELECT DISTINCT ON (sh.bookmaker)
      sh.bookmaker,
      sh.status,
      sh.latency_ms,
      sh.success_rate,
      sh.created_at as last_check,
      sh.error_count
    FROM scraper_health sh
    ORDER BY sh.bookmaker, sh.created_at DESC
  )
  SELECT 
    l.bookmaker,
    l.status,
    l.latency_ms::DECIMAL,
    l.success_rate,
    l.last_check,
    l.error_count::BIGINT
  FROM latest l;
END;
$$;

-- Get CLV leaderboard function
CREATE OR REPLACE FUNCTION public.get_clv_leaderboard(p_days integer DEFAULT 30, p_limit integer DEFAULT 20)
RETURNS TABLE(
  user_id uuid, 
  email text, 
  full_name text, 
  subscription_tier text, 
  total_bets integer, 
  avg_clv numeric, 
  positive_clv_rate numeric, 
  total_edge_captured numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.subscription_tier,
    SUM(c.bets_placed)::INT as total_bets,
    AVG(c.avg_clv_percent) as avg_clv,
    (SUM(c.positive_clv_bets)::DECIMAL / NULLIF(SUM(c.bets_placed), 0) * 100) as positive_clv_rate,
    SUM(c.total_edge_captured) as total_edge_captured
  FROM user_clv_daily c
  JOIN profiles p ON p.id = c.user_id
  WHERE c.date >= CURRENT_DATE - p_days
  GROUP BY p.id, p.email, p.full_name, p.subscription_tier
  HAVING SUM(c.bets_placed) >= 10
  ORDER BY AVG(c.avg_clv_percent) DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- Get hottest markets function
CREATE OR REPLACE FUNCTION public.get_hottest_markets(p_days integer DEFAULT 7, p_limit integer DEFAULT 10)
RETURNS TABLE(
  sport text, 
  league text, 
  market_type text, 
  avg_edge numeric, 
  max_edge numeric, 
  opportunities integer, 
  hit_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.sport,
    m.league,
    m.market_type,
    AVG(m.avg_edge_percent) as avg_edge,
    MAX(m.max_edge_percent) as max_edge,
    SUM(m.opportunities_found)::INT as opportunities,
    AVG(m.hit_rate) as hit_rate
  FROM market_edge_stats m
  WHERE m.date >= CURRENT_DATE - p_days
  GROUP BY m.sport, m.league, m.market_type
  HAVING SUM(m.opportunities_found) >= 5
  ORDER BY AVG(m.avg_edge_percent) DESC
  LIMIT p_limit;
END;
$$;

-- Get slowest bookmakers function
CREATE OR REPLACE FUNCTION public.get_slowest_bookmakers(p_days integer DEFAULT 7)
RETURNS TABLE(
  bookmaker text, 
  avg_reaction_sec numeric, 
  delayed_rate numeric, 
  market_coverage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.bookmaker,
    AVG(b.avg_reaction_time_sec) as avg_reaction_sec,
    (SUM(b.delayed_updates)::DECIMAL / NULLIF(SUM(b.odds_changes_tracked), 0) * 100) as delayed_rate,
    AVG(b.market_coverage_pct) as market_coverage
  FROM bookmaker_speed_metrics b
  WHERE b.date >= CURRENT_DATE - p_days
  GROUP BY b.bookmaker
  ORDER BY AVG(b.avg_reaction_time_sec) DESC;
END;
$$;

-- Get user bankroll function
CREATE OR REPLACE FUNCTION public.get_user_bankroll(p_user_id uuid)
RETURNS TABLE(
  current_balance numeric, 
  starting_balance numeric, 
  total_deposits numeric, 
  total_withdrawals numeric, 
  profit_loss numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(balance), 0)::DECIMAL as current_balance,
    COALESCE(SUM(starting_balance), 0)::DECIMAL as starting_balance,
    COALESCE(SUM(total_deposited), 0)::DECIMAL as total_deposits,
    COALESCE(SUM(total_withdrawn), 0)::DECIMAL as total_withdrawals,
    COALESCE(SUM(balance - starting_balance), 0)::DECIMAL as profit_loss
  FROM bankrolls
  WHERE bankrolls.user_id = p_user_id;
END;
$$;

-- Get payment gateway function
CREATE OR REPLACE FUNCTION public.get_payment_gateway(p_currency text DEFAULT 'NGN')
RETURNS TABLE(provider text, display_name text, public_key text, is_test_mode boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg.provider,
    pg.display_name,
    pg.credentials->>'public_key' as public_key,
    pg.is_test_mode
  FROM payment_gateways pg
  WHERE pg.is_enabled = TRUE
    AND p_currency = ANY(pg.supported_currencies)
  ORDER BY pg.priority ASC
  LIMIT 1;
END;
$$;

-- Get plan price function
CREATE OR REPLACE FUNCTION public.get_plan_price(p_plan_slug text, p_currency text DEFAULT 'NGN', p_interval text DEFAULT 'monthly')
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_price DECIMAL;
BEGIN
  SELECT (prices->p_currency->>p_interval)::DECIMAL
  INTO v_price
  FROM subscription_plans
  WHERE slug = p_plan_slug AND is_active = TRUE;
  
  RETURN COALESCE(v_price, 0);
END;
$$;

-- Upsert value bet function
CREATE OR REPLACE FUNCTION public.upsert_value_bet(
  p_match_id text, 
  p_match_name text, 
  p_league text, 
  p_kickoff timestamp with time zone, 
  p_sharp_odds_home numeric, 
  p_sharp_odds_draw numeric, 
  p_sharp_odds_away numeric, 
  p_soft_bookie text, 
  p_soft_odds_home numeric, 
  p_soft_odds_draw numeric, 
  p_soft_odds_away numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_edge_home DECIMAL;
    v_edge_draw DECIMAL;
    v_edge_away DECIMAL;
    v_best_edge DECIMAL;
    v_best_market TEXT;
BEGIN
    -- Calculate edges
    v_edge_home := CASE 
        WHEN p_sharp_odds_home IS NOT NULL AND p_soft_odds_home IS NOT NULL 
        THEN ((p_soft_odds_home / p_sharp_odds_home - 1.0) * 100)
        ELSE NULL
    END;
    
    v_edge_draw := CASE 
        WHEN p_sharp_odds_draw IS NOT NULL AND p_soft_odds_draw IS NOT NULL 
        THEN ((p_soft_odds_draw / p_sharp_odds_draw - 1.0) * 100)
        ELSE NULL
    END;
    
    v_edge_away := CASE 
        WHEN p_sharp_odds_away IS NOT NULL AND p_soft_odds_away IS NOT NULL 
        THEN ((p_soft_odds_away / p_sharp_odds_away - 1.0) * 100)
        ELSE NULL
    END;
    
    -- Find best edge
    v_best_edge := GREATEST(COALESCE(v_edge_home, 0), COALESCE(v_edge_draw, 0), COALESCE(v_edge_away, 0));
    
    v_best_market := CASE 
        WHEN v_edge_home = v_best_edge THEN 'home'
        WHEN v_edge_draw = v_best_edge THEN 'draw'
        ELSE 'away'
    END;
    
    INSERT INTO public.value_opportunities (
        match_id, match_name, league_name, kickoff_time,
        sharp_odds_home, sharp_odds_draw, sharp_odds_away,
        soft_bookie, soft_odds_home, soft_odds_draw, soft_odds_away,
        edge_home_percent, edge_draw_percent, edge_away_percent,
        best_edge_percent, best_edge_market,
        updated_at
    )
    VALUES (
        p_match_id, p_match_name, p_league, p_kickoff,
        p_sharp_odds_home, p_sharp_odds_draw, p_sharp_odds_away,
        p_soft_bookie, p_soft_odds_home, p_soft_odds_draw, p_soft_odds_away,
        v_edge_home, v_edge_draw, v_edge_away,
        v_best_edge, v_best_market,
        NOW()
    )
    ON CONFLICT (match_id) DO UPDATE SET
        sharp_odds_home = EXCLUDED.sharp_odds_home,
        sharp_odds_draw = EXCLUDED.sharp_odds_draw,
        sharp_odds_away = EXCLUDED.sharp_odds_away,
        soft_odds_home = EXCLUDED.soft_odds_home,
        soft_odds_draw = EXCLUDED.soft_odds_draw,
        soft_odds_away = EXCLUDED.soft_odds_away,
        edge_home_percent = EXCLUDED.edge_home_percent,
        edge_draw_percent = EXCLUDED.edge_draw_percent,
        edge_away_percent = EXCLUDED.edge_away_percent,
        best_edge_percent = EXCLUDED.best_edge_percent,
        best_edge_market = EXCLUDED.best_edge_market,
        kickoff_time = EXCLUDED.kickoff_time,
        updated_at = NOW();
END;
$$;

-- Admin functions for subscription plans
DROP FUNCTION IF EXISTS public.admin_get_subscription_plans();
CREATE OR REPLACE FUNCTION public.admin_get_subscription_plans()
RETURNS SETOF public.subscription_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN QUERY SELECT * FROM subscription_plans ORDER BY created_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_upsert_subscription_plan(uuid, text, text, text, jsonb, jsonb, jsonb, boolean, integer);
CREATE OR REPLACE FUNCTION public.admin_upsert_subscription_plan(
  p_id uuid, 
  p_slug text, 
  p_name text, 
  p_description text, 
  p_prices jsonb, 
  p_features jsonb, 
  p_limits jsonb, 
  p_is_popular boolean, 
  p_sort_order integer
)
RETURNS public.subscription_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan public.subscription_plans;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  INSERT INTO subscription_plans (id, slug, name, description, prices, features, limits, is_popular, sort_order)
  VALUES (COALESCE(p_id, gen_random_uuid()), p_slug, p_name, p_description, p_prices, p_features, p_limits, p_is_popular, p_sort_order)
  ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    prices = EXCLUDED.prices,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    is_popular = EXCLUDED.is_popular,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW()
  RETURNING * INTO v_plan;
  
  RETURN v_plan;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_delete_subscription_plan(uuid);
CREATE OR REPLACE FUNCTION public.admin_delete_subscription_plan(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  DELETE FROM subscription_plans WHERE id = p_id;
  RETURN TRUE;
END;
$$;

-- Admin functions for site settings
DROP FUNCTION IF EXISTS public.admin_get_site_settings();
CREATE OR REPLACE FUNCTION public.admin_get_site_settings()
RETURNS SETOF public.site_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN QUERY SELECT * FROM site_settings ORDER BY key;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_update_site_setting(text, jsonb);
CREATE OR REPLACE FUNCTION public.admin_update_site_setting(p_key text, p_value jsonb)
RETURNS public.site_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_setting public.site_settings;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE site_settings 
  SET 
    value = p_value,
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE key = p_key
  RETURNING * INTO v_setting;
  
  RETURN v_setting;
END;
$$;

-- Admin functions for payment gateways
DROP FUNCTION IF EXISTS public.admin_get_payment_gateways();
CREATE OR REPLACE FUNCTION public.admin_get_payment_gateways()
RETURNS SETOF public.payment_gateways
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN QUERY SELECT * FROM payment_gateways ORDER BY priority;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_update_payment_gateway(uuid, boolean, boolean, jsonb);
CREATE OR REPLACE FUNCTION public.admin_update_payment_gateway(
  p_id uuid, 
  p_is_enabled boolean, 
  p_is_test_mode boolean, 
  p_credentials jsonb
)
RETURNS public.payment_gateways
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_gateway public.payment_gateways;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE payment_gateways 
  SET 
    is_enabled = p_is_enabled,
    is_test_mode = p_is_test_mode,
    credentials = p_credentials,
    updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_gateway;
  
  RETURN v_gateway;
END;
$$;

-- ==================================================================================
-- PART 5: CREATE TRIGGERS
-- ==================================================================================

-- Create trigger on auth.users for new user profile creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bankrolls_updated_at 
  BEFORE UPDATE ON public.bankrolls 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payment_gateways_updated_at 
  BEFORE UPDATE ON public.payment_gateways 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER site_settings_updated_at 
  BEFORE UPDATE ON public.site_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscription_plans_updated_at 
  BEFORE UPDATE ON public.subscription_plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at 
  BEFORE UPDATE ON public.subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- CLV calculation trigger
CREATE TRIGGER bets_calculate_clv 
  BEFORE INSERT OR UPDATE ON public.bets 
  FOR EACH ROW EXECUTE FUNCTION calculate_clv();


-- ==================================================================================
-- PART 6: ENABLE RLS AND CREATE POLICIES
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
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin users policies
CREATE POLICY "Users can check own admin status" ON public.admin_users
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view own admin status" ON public.admin_users
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage admin users" ON public.admin_users
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid() AND au.role = 'super_admin'));

-- Admin audit log policies
CREATE POLICY "Admins can read audit logs" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Site settings policies
CREATE POLICY "Admins can read site settings" ON public.site_settings
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "Admins can manage site settings" ON public.site_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "Super admins can modify site settings" ON public.site_settings
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid() AND admin_users.role = 'super_admin'));

-- Payment gateways policies
CREATE POLICY "Admins can read payment gateways" ON public.payment_gateways
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "Admins can manage payment gateways" ON public.payment_gateways
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "Super admins can modify payment gateways" ON public.payment_gateways
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid() AND admin_users.role = 'super_admin'));

-- Subscription plans policies
CREATE POLICY "Public can read active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Subscription events policies
CREATE POLICY "Admins can read subscription events" ON public.subscription_events
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "Admins can manage subscription events" ON public.subscription_events
  FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Revenue daily policies
CREATE POLICY "Admins can read revenue" ON public.revenue_daily
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Bets policies
CREATE POLICY "Users can manage own bets" ON public.bets
  FOR ALL USING (auth.uid() = user_id);

-- Bankrolls policies
CREATE POLICY "Users can manage own bankrolls" ON public.bankrolls
  FOR ALL USING (auth.uid() = user_id);

-- User CLV daily policies
CREATE POLICY "Admins can read user CLV" ON public.user_clv_daily
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "Admins can view user CLV" ON public.user_clv_daily
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Alert log policies
CREATE POLICY "Users can view own alerts" ON public.alert_log
  FOR SELECT USING (auth.uid() = user_id);

-- Value opportunities policies
CREATE POLICY "Allow public read access" ON public.value_opportunities
  FOR SELECT USING (true);

CREATE POLICY "Public view opportunities" ON public.value_opportunities
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage opportunities" ON public.value_opportunities
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "Allow service upsert" ON public.value_opportunities
  FOR ALL USING (auth.role() = 'service_role');

-- Odds snapshots policies
CREATE POLICY "Authenticated users can read odds snapshots" ON public.odds_snapshots
  FOR SELECT TO authenticated USING (true);

-- Scraper health policies
CREATE POLICY "Admins can read scraper health" ON public.scraper_health
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "Admins can view scraper health" ON public.scraper_health
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Proxy pool policies
CREATE POLICY "Admins can read proxy pool" ON public.proxy_pool
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "Admins can manage proxy pool" ON public.proxy_pool
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Proxy logs policies
CREATE POLICY "Admins can read proxy logs" ON public.proxy_logs
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Market edge stats policies
CREATE POLICY "Admins can read market edge stats" ON public.market_edge_stats
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "Admins can view market edge stats" ON public.market_edge_stats
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Bookmaker speed metrics policies
CREATE POLICY "Admins can read bookmaker speed" ON public.bookmaker_speed_metrics
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- System alerts policies
CREATE POLICY "Admins can read system alerts" ON public.system_alerts
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "Admins can manage system alerts" ON public.system_alerts
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));


-- ==================================================================================
-- PART 7: INSERT DEFAULT DATA
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


-- ==================================================================================
-- PART 8: CREATE TRIGGER FUNCTION FOR ODDS SCRAPING (UPDATE PROJECT URL!)
-- ==================================================================================

-- NOTE: Replace YOUR_NEW_PROJECT_ID with your new Supabase project ID
-- Also replace YOUR_SERVICE_ROLE_KEY with the new project's service role key

CREATE OR REPLACE FUNCTION public.trigger_odds_scraping()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the Edge Function using pg_net extension
  -- UPDATE THIS URL WITH YOUR NEW PROJECT ID!
  PERFORM
    net.http_post(
      url := 'https://YOUR_NEW_PROJECT_ID.supabase.co/functions/v1/scrape-odds',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body := '{}'::jsonb
    );
    
  RAISE NOTICE 'Triggered odds scraping at %', NOW();
END;
$$;


-- ==================================================================================
-- PART 9: SETUP CRON JOB (RUN AFTER PROJECT IS FULLY SET UP)
-- ==================================================================================

-- Schedule scraping every 2 minutes
-- NOTE: Run this AFTER deploying your edge function
SELECT cron.schedule(
  'trigger-odds-scraping',
  '*/2 * * * *',
  $$SELECT trigger_odds_scraping();$$
);


-- ==================================================================================
-- MIGRATION COMPLETE!
-- ==================================================================================
-- 
-- NEXT STEPS:
-- 1. Update .env.local with new NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
-- 2. Update the trigger_odds_scraping function with the correct project URL and service role key
-- 3. Deploy Edge Functions (scrape-odds) to the new project
-- 4. Update Railway bridge environment variable with new SUPABASE_URL and SUPABASE_SERVICE_KEY
-- 5. Create an admin user after your first user signs up:
--    INSERT INTO admin_users (user_id, role) VALUES ('USER_UUID_HERE', 'super_admin');
--
-- ==================================================================================
