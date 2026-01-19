import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/opportunities - Get active value opportunities
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user (optional for this endpoint)
    const { data: { user } } = await supabase.auth.getUser();
    
    const { searchParams } = new URL(request.url);
    const minEdge = parseFloat(searchParams.get('min_edge') || '2');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const sport = searchParams.get('sport');
    const bookmaker = searchParams.get('bookmaker');

    let query = supabase
      .from('value_opportunities')
      .select('*')
      .gte('best_edge_percent', minEdge)
      .gt('kickoff_time', new Date().toISOString())
      .eq('is_alerted', false)
      .order('best_edge_percent', { ascending: false })
      .limit(limit);

    if (bookmaker) {
      query = query.eq('soft_bookie', bookmaker);
    }

    const { data: opportunities, error } = await query;

    if (error) {
      console.error('Error fetching opportunities:', error);
      return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
    }

    // Get user's subscription tier if authenticated
    let tier = 'free';
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();
      
      tier = profile?.subscription_tier || 'free';
    }

    // Filter opportunities based on tier
    const filteredOpportunities = filterByTier(opportunities || [], tier);

    return NextResponse.json({ 
      opportunities: filteredOpportunities,
      count: filteredOpportunities.length,
      tier,
      filters: { min_edge: minEdge, sport, bookmaker }
    });
  } catch (error) {
    console.error('Opportunities API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Filter opportunities based on subscription tier
function filterByTier(opportunities: any[], tier: string): any[] {
  const now = Date.now();
  
  // Transform data to match the frontend interface
  const transformed = opportunities.map(opp => ({
    id: opp.match_id,
    match_name: opp.match_name,
    sport: 'football', // Default to football for now
    league: opp.league_name || 'Unknown League',
    kickoff_time: opp.kickoff_time,
    market: opp.best_edge_market || 'Unknown',
    selection: opp.best_edge_market === 'home' ? 'Home Win' : 
               opp.best_edge_market === 'draw' ? 'Draw' : 
               opp.best_edge_market === 'away' ? 'Away Win' : 'Unknown',
    sharp_bookmaker: opp.sharp_bookie || 'Pinnacle',
    sharp_odds: getSharpOddsForMarket(opp, opp.best_edge_market),
    soft_bookmaker: opp.soft_bookie || 'Unknown',
    soft_odds: getSoftOddsForMarket(opp, opp.best_edge_market),
    edge_percent: opp.best_edge_percent || 0,
    kelly_fraction: calculateKelly(opp.best_edge_percent, getSoftOddsForMarket(opp, opp.best_edge_market)),
    status: 'active',
    detected_at: opp.created_at,
    bet_link: `https://www.bet9ja.com`, // Placeholder
  }));
  
  switch (tier) {
    case 'free':
      // Free tier: Only show top 3 opportunities, delayed by 5 minutes
      const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();
      return transformed
        .filter(opp => opp.detected_at <= fiveMinutesAgo)
        .slice(0, 3)
        .map(opp => ({
          ...opp,
          // Hide sharp bookmaker details for free tier
          sharp_bookmaker: '🔒 Upgrade to see',
          sharp_odds: null,
          kelly_fraction: null,
        }));
    
    case 'starter':
      // Starter tier: All opportunities, delayed by 2 minutes
      const twoMinutesAgo = new Date(now - 2 * 60 * 1000).toISOString();
      return transformed
        .filter(opp => opp.detected_at <= twoMinutesAgo)
        .slice(0, 10);
    
    case 'pro':
      // Pro tier: Real-time, unlimited opportunities
      return transformed;
    
    default:
      return transformed.slice(0, 3);
  }
}

// Helper functions
function getSharpOddsForMarket(opp: any, market: string): number | null {
  if (market === 'home') return opp.sharp_odds_home;
  if (market === 'draw') return opp.sharp_odds_draw;
  if (market === 'away') return opp.sharp_odds_away;
  return null;
}

function getSoftOddsForMarket(opp: any, market: string): number {
  if (market === 'home') return opp.soft_odds_home || 1.0;
  if (market === 'draw') return opp.soft_odds_draw || 1.0;
  if (market === 'away') return opp.soft_odds_away || 1.0;
  return 1.0;
}

function calculateKelly(edgePercent: number, odds: number): number | null {
  if (!edgePercent || !odds) return null;
  const edge = edgePercent / 100;
  const p = 1 / odds + edge; // Implied true probability
  const q = 1 - p;
  const b = odds - 1;
  const kelly = (p * b - q) / b;
  return kelly > 0 ? kelly * 0.25 : 0; // Quarter Kelly for safety
}
