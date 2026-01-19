-- Function to store odds snapshots
CREATE OR REPLACE FUNCTION store_odds_snapshot(
  p_match_id TEXT,
  p_match_name TEXT,
  p_sport TEXT,
  p_league TEXT,
  p_kickoff_time TIMESTAMPTZ,
  p_bookmaker TEXT,
  p_market TEXT,
  p_selection TEXT,
  p_odds DECIMAL(6, 3),
  p_is_sharp BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO odds_snapshots (
    match_id,
    match_name,
    sport,
    league,
    kickoff_time,
    bookmaker,
    market,
    selection,
    odds,
    is_sharp,
    scraped_at
  ) VALUES (
    p_match_id,
    p_match_name,
    p_sport,
    p_league,
    p_kickoff_time,
    p_bookmaker,
    p_market,
    p_selection,
    p_odds,
    p_is_sharp,
    NOW()
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Function to get latest odds for a match
CREATE OR REPLACE FUNCTION get_latest_odds(
  p_match_id TEXT,
  p_market TEXT DEFAULT NULL
)
RETURNS TABLE (
  bookmaker TEXT,
  market TEXT,
  selection TEXT,
  odds DECIMAL(6, 3),
  is_sharp BOOLEAN,
  scraped_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (os.bookmaker, os.market, os.selection)
    os.bookmaker,
    os.market,
    os.selection,
    os.odds,
    os.is_sharp,
    os.scraped_at
  FROM odds_snapshots os
  WHERE os.match_id = p_match_id
    AND (p_market IS NULL OR os.market = p_market)
    AND os.scraped_at > NOW() - INTERVAL '1 hour' -- Only recent odds
  ORDER BY os.bookmaker, os.market, os.selection, os.scraped_at DESC;
END;
$$;

-- Function to detect and create value opportunities
CREATE OR REPLACE FUNCTION detect_value_opportunities(
  p_min_edge DECIMAL(5, 2) DEFAULT 3.0,
  p_sport TEXT DEFAULT 'football'
)
RETURNS TABLE (
  match_id TEXT,
  match_name TEXT,
  sport TEXT,
  league TEXT,
  kickoff_time TIMESTAMPTZ,
  market TEXT,
  selection TEXT,
  sharp_bookmaker TEXT,
  sharp_odds DECIMAL(6, 3),
  soft_bookmaker TEXT,
  soft_odds DECIMAL(6, 3),
  edge_percent DECIMAL(5, 2),
  kelly_fraction DECIMAL(5, 4)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH recent_odds AS (
    -- Get latest odds from last hour
    SELECT DISTINCT ON (os.match_id, os.market, os.selection, os.bookmaker)
      os.match_id,
      os.match_name,
      os.sport,
      os.league,
      os.kickoff_time,
      os.market,
      os.selection,
      os.bookmaker,
      os.odds,
      os.is_sharp,
      os.scraped_at
    FROM odds_snapshots os
    WHERE os.scraped_at > NOW() - INTERVAL '1 hour'
      AND os.kickoff_time > NOW() -- Only future matches
      AND (p_sport = 'all' OR os.sport = p_sport)
    ORDER BY os.match_id, os.market, os.selection, os.bookmaker, os.scraped_at DESC
  ),
  sharp_odds AS (
    -- Best sharp odds (lowest, most efficient)
    SELECT 
      ro.match_id,
      ro.match_name,
      ro.sport,
      ro.league,
      ro.kickoff_time,
      ro.market,
      ro.selection,
      ro.bookmaker as sharp_bookmaker,
      MIN(ro.odds) as sharp_odds
    FROM recent_odds ro
    WHERE ro.is_sharp = TRUE
    GROUP BY ro.match_id, ro.match_name, ro.sport, ro.league, ro.kickoff_time, ro.market, ro.selection, ro.bookmaker
  ),
  soft_odds AS (
    -- All soft bookmaker odds
    SELECT 
      ro.match_id,
      ro.market,
      ro.selection,
      ro.bookmaker as soft_bookmaker,
      ro.odds as soft_odds
    FROM recent_odds ro
    WHERE ro.is_sharp = FALSE
  ),
  value_bets AS (
    -- Compare sharp vs soft odds
    SELECT
      s.match_id,
      s.match_name,
      s.sport,
      s.league,
      s.kickoff_time,
      s.market,
      s.selection,
      s.sharp_bookmaker,
      s.sharp_odds,
      so.soft_bookmaker,
      so.soft_odds,
      -- Calculate edge
      (((1.0 / s.sharp_odds) - (1.0 / so.soft_odds)) / (1.0 / so.soft_odds) * 100)::DECIMAL(5,2) as edge,
      -- Calculate Kelly fraction (quarter Kelly for safety)
      GREATEST(0, LEAST(
        ((1.0 / s.sharp_odds) * so.soft_odds - 1) / (so.soft_odds - 1) * 0.25,
        0.05
      ))::DECIMAL(5,4) as kelly
    FROM sharp_odds s
    JOIN soft_odds so 
      ON s.match_id = so.match_id 
      AND s.market = so.market 
      AND s.selection = so.selection
    WHERE so.soft_odds > s.sharp_odds -- Soft bookmaker has better odds
  )
  SELECT 
    vb.match_id,
    vb.match_name,
    vb.sport,
    vb.league,
    vb.kickoff_time,
    vb.market,
    vb.selection,
    vb.sharp_bookmaker,
    vb.sharp_odds,
    vb.soft_bookmaker,
    vb.soft_odds,
    vb.edge as edge_percent,
    vb.kelly as kelly_fraction
  FROM value_bets vb
  WHERE vb.edge >= p_min_edge
  ORDER BY vb.edge DESC;
END;
$$;

-- Function to update opportunity status
CREATE OR REPLACE FUNCTION update_opportunity_status(
  p_opportunity_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE value_opportunities
  SET 
    status = p_status,
    expired_at = CASE WHEN p_status != 'active' THEN NOW() ELSE NULL END
  WHERE id = p_opportunity_id;
END;
$$;

-- Function to cleanup old odds snapshots (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_odds_snapshots()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM odds_snapshots
  WHERE scraped_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION store_odds_snapshot TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_odds TO authenticated;
GRANT EXECUTE ON FUNCTION detect_value_opportunities TO authenticated;
GRANT EXECUTE ON FUNCTION update_opportunity_status TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_odds_snapshots TO postgres;

-- Create scheduled job to cleanup old odds (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-odds', '0 3 * * *', 'SELECT cleanup_old_odds_snapshots();');
