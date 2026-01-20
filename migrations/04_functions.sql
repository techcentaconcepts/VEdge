-- ==================================================================================
-- VANTEDGE MIGRATION 04: FUNCTIONS
-- ==================================================================================
-- Run AFTER 03_indexes.sql
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

-- Verify functions created
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace ORDER BY proname;
