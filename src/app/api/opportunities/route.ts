import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/opportunities - Get active value opportunities
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
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

    return NextResponse.json({ opportunities });
  } catch (error) {
    console.error('Opportunities API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
