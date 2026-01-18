import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/stats - Get user betting statistics
export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Call the calculate_user_stats RPC function
    const { data: stats, error: statsError } = await supabase
      .rpc('calculate_user_stats', { p_user_id: user.id });

    if (statsError) {
      console.error('Error calculating stats:', statsError);
      return NextResponse.json({ error: 'Failed to calculate stats' }, { status: 500 });
    }

    // Get monthly breakdown
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('bets')
      .select('placed_at, stake, profit_loss, outcome')
      .eq('user_id', user.id)
      .gte('placed_at', from || new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
      .lte('placed_at', to || new Date().toISOString())
      .order('placed_at', { ascending: true });

    if (monthlyError) {
      console.error('Error fetching monthly data:', monthlyError);
    }

    // Aggregate by month
    const monthlyStats = (monthlyData || []).reduce((acc: any[], bet) => {
      const month = new Date(bet.placed_at).toISOString().slice(0, 7);
      const existing = acc.find(m => m.month === month);
      
      if (existing) {
        existing.bets += 1;
        existing.staked += bet.stake;
        existing.profit += bet.profit_loss || 0;
        if (bet.outcome === 'won') existing.wins += 1;
        if (bet.outcome === 'lost') existing.losses += 1;
      } else {
        acc.push({
          month,
          bets: 1,
          staked: bet.stake,
          profit: bet.profit_loss || 0,
          wins: bet.outcome === 'won' ? 1 : 0,
          losses: bet.outcome === 'lost' ? 1 : 0,
        });
      }
      
      return acc;
    }, []);

    // Get bookmaker breakdown
    const { data: bookmakerData, error: bookmakerError } = await supabase
      .from('bets')
      .select('bookmaker, stake, profit_loss, outcome')
      .eq('user_id', user.id);

    const bookmakerStats = (bookmakerData || []).reduce((acc: any, bet) => {
      if (!acc[bet.bookmaker]) {
        acc[bet.bookmaker] = { bets: 0, staked: 0, profit: 0, wins: 0, losses: 0 };
      }
      acc[bet.bookmaker].bets += 1;
      acc[bet.bookmaker].staked += bet.stake;
      acc[bet.bookmaker].profit += bet.profit_loss || 0;
      if (bet.outcome === 'won') acc[bet.bookmaker].wins += 1;
      if (bet.outcome === 'lost') acc[bet.bookmaker].losses += 1;
      return acc;
    }, {});

    return NextResponse.json({
      stats,
      monthly: monthlyStats,
      bookmakers: bookmakerStats,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
