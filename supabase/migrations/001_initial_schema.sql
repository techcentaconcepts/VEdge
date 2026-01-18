-- ============================================
-- VANTEDGE DATABASE SCHEMA
-- Version: 1.0.0
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' 
    CHECK (subscription_tier IN ('free', 'starter', 'pro')),
  telegram_chat_id BIGINT UNIQUE,
  telegram_username TEXT,
  stripe_customer_id TEXT UNIQUE,
  paystack_customer_code TEXT UNIQUE,
  alert_preferences JSONB DEFAULT '{"min_edge": 5, "sports": ["football"], "enabled": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram ON profiles(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- ============================================
-- BANKROLLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bankrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bookmaker TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, bookmaker)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bankrolls_user ON bankrolls(user_id);

-- RLS Policies
ALTER TABLE bankrolls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own bankrolls" ON bankrolls;
CREATE POLICY "Users can manage own bankrolls" 
  ON bankrolls FOR ALL 
  USING (auth.uid() = user_id);

-- ============================================
-- BETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  external_bet_id TEXT,
  bookmaker TEXT NOT NULL,
  sport TEXT NOT NULL,
  league TEXT,
  match_name TEXT NOT NULL,
  market TEXT NOT NULL,
  selection TEXT NOT NULL,
  odds DECIMAL(6, 3) NOT NULL,
  stake DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  potential_return DECIMAL(12, 2) GENERATED ALWAYS AS (stake * odds) STORED,
  outcome TEXT CHECK (outcome IN ('pending', 'won', 'lost', 'void', 'cashout')),
  profit_loss DECIMAL(12, 2),
  closing_odds DECIMAL(6, 3),
  clv_percent DECIMAL(5, 2),
  placed_at TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ,
  synced_from TEXT CHECK (synced_from IN ('extension', 'manual', 'api')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, external_bet_id, bookmaker)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bets_user_date ON bets(user_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_user_bookmaker ON bets(user_id, bookmaker);
CREATE INDEX IF NOT EXISTS idx_bets_outcome ON bets(outcome) WHERE outcome = 'pending';

-- RLS Policies
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own bets" ON bets;
CREATE POLICY "Users can manage own bets" 
  ON bets FOR ALL 
  USING (auth.uid() = user_id);

-- ============================================
-- ODDS SNAPSHOTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS odds_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL,
  match_name TEXT NOT NULL,
  sport TEXT NOT NULL,
  league TEXT,
  kickoff_time TIMESTAMPTZ NOT NULL,
  bookmaker TEXT NOT NULL,
  market TEXT NOT NULL,
  selection TEXT NOT NULL,
  odds DECIMAL(6, 3) NOT NULL,
  is_sharp BOOLEAN NOT NULL DEFAULT FALSE,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_odds_match_time ON odds_snapshots(match_id, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_odds_bookmaker ON odds_snapshots(bookmaker, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_odds_sharp ON odds_snapshots(is_sharp, scraped_at DESC) WHERE is_sharp = TRUE;

-- ============================================
-- VALUE OPPORTUNITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS value_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL,
  match_name TEXT NOT NULL,
  sport TEXT NOT NULL,
  league TEXT,
  kickoff_time TIMESTAMPTZ NOT NULL,
  market TEXT NOT NULL,
  selection TEXT NOT NULL,
  sharp_bookmaker TEXT NOT NULL,
  sharp_odds DECIMAL(6, 3) NOT NULL,
  soft_bookmaker TEXT NOT NULL,
  soft_odds DECIMAL(6, 3) NOT NULL,
  edge_percent DECIMAL(5, 2) NOT NULL,
  kelly_fraction DECIMAL(5, 4),
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'expired', 'odds_moved', 'won', 'lost')),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  expired_at TIMESTAMPTZ,
  bet_link TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_active ON value_opportunities(status, detected_at DESC) 
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_opportunities_edge ON value_opportunities(edge_percent DESC) 
  WHERE status = 'active';

-- ============================================
-- ALERT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES value_opportunities(id),
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'email', 'push')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'clicked')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON alert_log(user_id, sent_at DESC);

-- RLS Policies
ALTER TABLE alert_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own alerts" ON alert_log;
CREATE POLICY "Users can view own alerts" 
  ON alert_log FOR SELECT 
  USING (auth.uid() = user_id);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'pro')),
  payment_provider TEXT CHECK (payment_provider IN ('stripe', 'paystack')),
  external_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription" 
  ON subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS bankrolls_updated_at ON bankrolls;
CREATE TRIGGER bankrolls_updated_at
  BEFORE UPDATE ON bankrolls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Calculate CLV when bet is settled
CREATE OR REPLACE FUNCTION calculate_clv()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.closing_odds IS NOT NULL AND NEW.odds IS NOT NULL THEN
    NEW.clv_percent = ((NEW.odds / NEW.closing_odds) - 1) * 100;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bets_calculate_clv ON bets;
CREATE TRIGGER bets_calculate_clv
  BEFORE INSERT OR UPDATE ON bets
  FOR EACH ROW EXECUTE FUNCTION calculate_clv();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Calculate user stats
CREATE OR REPLACE FUNCTION calculate_user_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_bets', COUNT(*),
    'total_staked', COALESCE(SUM(stake), 0),
    'total_profit', COALESCE(SUM(profit_loss), 0),
    'roi', CASE WHEN SUM(stake) > 0 THEN (SUM(profit_loss) / SUM(stake)) * 100 ELSE 0 END,
    'win_rate', CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE outcome = 'won')::DECIMAL / COUNT(*) FILTER (WHERE outcome IN ('won', 'lost'))) * 100 ELSE 0 END,
    'avg_clv', COALESCE(AVG(clv_percent), 0),
    'pending_bets', COUNT(*) FILTER (WHERE outcome = 'pending'),
    'last_updated', NOW()
  ) INTO result
  FROM bets
  WHERE user_id = p_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active opportunities with edge threshold
CREATE OR REPLACE FUNCTION get_active_opportunities(p_min_edge DECIMAL DEFAULT 2.0, p_limit INT DEFAULT 20)
RETURNS SETOF value_opportunities AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM value_opportunities
  WHERE status = 'active'
    AND edge_percent >= p_min_edge
    AND kickoff_time > NOW()
  ORDER BY edge_percent DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE DATA (for development)
-- ============================================

-- Uncomment to insert sample data for testing
/*
INSERT INTO value_opportunities (match_id, match_name, sport, league, kickoff_time, market, selection, sharp_bookmaker, sharp_odds, soft_bookmaker, soft_odds, edge_percent, kelly_fraction, bet_link)
VALUES 
  ('arsenal-chelsea-20260118', 'Arsenal vs Chelsea', 'football', 'Premier League', NOW() + INTERVAL '2 hours', 'Over 2.5 Goals', 'Over', 'pinnacle', 1.85, 'bet9ja', 2.10, 13.5, 0.0675, 'https://bet9ja.com/sport/football/arsenal-chelsea'),
  ('mancity-liverpool-20260118', 'Man City vs Liverpool', 'football', 'Premier League', NOW() + INTERVAL '4 hours', 'Both Teams to Score', 'Yes', 'pinnacle', 1.72, 'sportybet', 1.95, 8.2, 0.0410, 'https://sportybet.com/football/mancity-liverpool');
*/
