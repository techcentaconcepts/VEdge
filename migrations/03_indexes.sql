-- ==================================================================================
-- VANTEDGE MIGRATION 03: INDEXES
-- ==================================================================================
-- Run AFTER 02_tables.sql
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

-- Verify indexes created
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
