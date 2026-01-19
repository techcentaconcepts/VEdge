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
      .eq('status', 'active')
      .gte('edge_percent', minEdge)
      .gt('kickoff_time', new Date().toISOString())
      .order('edge_percent', { ascending: false })
      .limit(limit);

    if (sport) {
      query = query.eq('sport', sport);
    }
    if (bookmaker) {
      query = query.eq('soft_bookmaker', bookmaker);
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
  
  switch (tier) {
    case 'free':
      // Free tier: Only show top 3 opportunities, delayed by 5 minutes
      const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();
      return opportunities
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
      return opportunities
        .filter(opp => opp.detected_at <= twoMinutesAgo)
        .slice(0, 10);
    
    case 'pro':
      // Pro tier: Real-time, unlimited opportunities
      return opportunities;
    
    default:
      return opportunities.slice(0, 3);
  }
}
