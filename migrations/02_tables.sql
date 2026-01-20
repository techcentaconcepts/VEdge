-- ==================================================================================
-- VANTEDGE MIGRATION 02: TABLES
-- ==================================================================================
-- Run AFTER 01_extensions.sql
-- Creates all tables in dependency order
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

-- Verify tables created
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
