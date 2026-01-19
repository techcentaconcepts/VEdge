-- =====================================================
-- VALUE OPPORTUNITIES TABLE & UPSERT ENGINE
-- The "Logic-in-DB" Strategy for Real-Time Odds Tracking
-- =====================================================

-- 1. Create the Value Opportunities Table (Optimized for Upserts)
CREATE TABLE IF NOT EXISTS public.value_opportunities (
    match_id TEXT PRIMARY KEY, -- Unique ID (e.g., "Chelsea_Arsenal_20260119")
    match_name TEXT NOT NULL,
    league_name TEXT,
    kickoff_time TIMESTAMPTZ,
    
    -- Sharp Data (The "True" Price from Pinnacle/Cloudbet)
    sharp_bookie TEXT DEFAULT 'Pinnacle',
    sharp_odds_home DECIMAL(10,2),
    sharp_odds_draw DECIMAL(10,2),
    sharp_odds_away DECIMAL(10,2),
    
    -- Soft Data (The "Lagging" Price from Nigerian bookies)
    soft_bookie TEXT,
    soft_odds_home DECIMAL(10,2),
    soft_odds_draw DECIMAL(10,2),
    soft_odds_away DECIMAL(10,2),
    
    -- Edge Calculation Columns (Auto-calculated)
    edge_home_percent DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN sharp_odds_home IS NOT NULL AND soft_odds_home IS NOT NULL 
            THEN ((soft_odds_home / sharp_odds_home - 1.0) * 100)
            ELSE NULL
        END
    ) STORED,
    
    edge_draw_percent DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN sharp_odds_draw IS NOT NULL AND soft_odds_draw IS NOT NULL 
            THEN ((soft_odds_draw / sharp_odds_draw - 1.0) * 100)
            ELSE NULL
        END
    ) STORED,
    
    edge_away_percent DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN sharp_odds_away IS NOT NULL AND soft_odds_away IS NOT NULL 
            THEN ((soft_odds_away / sharp_odds_away - 1.0) * 100)
            ELSE NULL
        END
    ) STORED,
    
    -- Best edge for quick filtering
    best_edge_percent DECIMAL(10,2) GENERATED ALWAYS AS (
        GREATEST(
            COALESCE(edge_home_percent, 0),
            COALESCE(edge_draw_percent, 0),
            COALESCE(edge_away_percent, 0)
        )
    ) STORED,
    
    best_edge_market TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN edge_home_percent = GREATEST(COALESCE(edge_home_percent, 0), COALESCE(edge_draw_percent, 0), COALESCE(edge_away_percent, 0)) 
            THEN 'home'
            WHEN edge_draw_percent = GREATEST(COALESCE(edge_home_percent, 0), COALESCE(edge_draw_percent, 0), COALESCE(edge_away_percent, 0)) 
            THEN 'draw'
            ELSE 'away'
        END
    ) STORED,
    
    -- Metadata
    is_alerted BOOLEAN DEFAULT FALSE, -- Has Telegram alert been sent?
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Index for Fast Queries
CREATE INDEX IF NOT EXISTS idx_value_opps_edge ON public.value_opportunities(best_edge_percent DESC) 
WHERE best_edge_percent >= 3.0; -- Only index high-value bets

CREATE INDEX IF NOT EXISTS idx_value_opps_updated ON public.value_opportunities(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_value_opps_kickoff ON public.value_opportunities(kickoff_time);

-- 3. Create the RPC function for Python Bridge
CREATE OR REPLACE FUNCTION upsert_value_bet(
    p_match_id TEXT,
    p_match_name TEXT,
    p_league TEXT,
    p_kickoff TIMESTAMPTZ,
    p_sharp_odds_home DECIMAL,
    p_sharp_odds_draw DECIMAL,
    p_sharp_odds_away DECIMAL,
    p_soft_bookie TEXT,
    p_soft_odds_home DECIMAL,
    p_soft_odds_draw DECIMAL,
    p_soft_odds_away DECIMAL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.value_opportunities (
        match_id, 
        match_name, 
        league_name, 
        kickoff_time,
        sharp_odds_home,
        sharp_odds_draw,
        sharp_odds_away,
        soft_bookie, 
        soft_odds_home,
        soft_odds_draw,
        soft_odds_away,
        updated_at
    )
    VALUES (
        p_match_id, 
        p_match_name, 
        p_league, 
        p_kickoff,
        p_sharp_odds_home,
        p_sharp_odds_draw,
        p_sharp_odds_away,
        p_soft_bookie, 
        p_soft_odds_home,
        p_soft_odds_draw,
        p_soft_odds_away,
        NOW()
    )
    ON CONFLICT (match_id) DO UPDATE SET
        sharp_odds_home = EXCLUDED.sharp_odds_home,
        sharp_odds_draw = EXCLUDED.sharp_odds_draw,
        sharp_odds_away = EXCLUDED.sharp_odds_away,
        soft_odds_home = EXCLUDED.soft_odds_home,
        soft_odds_draw = EXCLUDED.soft_odds_draw,
        soft_odds_away = EXCLUDED.soft_odds_away,
        kickoff_time = EXCLUDED.kickoff_time,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Stale Data Cleanup Function (Delete matches older than 10 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_odds()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.value_opportunities
    WHERE updated_at < NOW() - INTERVAL '10 minutes'
    RETURNING COUNT(*) INTO deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant Permissions
GRANT EXECUTE ON FUNCTION upsert_value_bet TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_stale_odds TO anon, authenticated;
GRANT SELECT ON public.value_opportunities TO anon, authenticated;

-- 6. Enable RLS
ALTER TABLE public.value_opportunities ENABLE ROW LEVEL SECURITY;

-- Allow all users to read value opportunities
CREATE POLICY "Allow public read access" ON public.value_opportunities
    FOR SELECT USING (true);

-- Only allow the service to insert/update (via RPC)
CREATE POLICY "Allow service upsert" ON public.value_opportunities
    FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.value_opportunities IS 'Real-time value betting opportunities with auto-calculated edge percentages';
COMMENT ON FUNCTION upsert_value_bet IS 'Atomic upsert for odds data from the Python bridge';
COMMENT ON FUNCTION cleanup_stale_odds IS 'Removes matches with outdated odds (>10 min old)';
