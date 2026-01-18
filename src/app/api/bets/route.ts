import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema
const betSchema = z.object({
  external_bet_id: z.string().optional(),
  bookmaker: z.string(),
  sport: z.string(),
  league: z.string().optional(),
  match_name: z.string(),
  market: z.string(),
  selection: z.string(),
  odds: z.number().positive(),
  stake: z.number().positive(),
  currency: z.string().default('NGN'),
  outcome: z.enum(['pending', 'won', 'lost', 'void', 'cashout']).optional(),
  profit_loss: z.number().optional(),
  closing_odds: z.number().optional(),
  placed_at: z.string().datetime(),
  settled_at: z.string().datetime().optional(),
  synced_from: z.enum(['extension', 'manual', 'api']).optional(),
});

const batchSyncSchema = z.object({
  bets: z.array(betSchema).min(1).max(100),
});

// GET /api/bets - List user's bets
export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const bookmaker = searchParams.get('bookmaker');
    const outcome = searchParams.get('outcome');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabase
      .from('bets')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('placed_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (bookmaker) {
      query = query.eq('bookmaker', bookmaker);
    }
    if (outcome) {
      query = query.eq('outcome', outcome);
    }
    if (from) {
      query = query.gte('placed_at', from);
    }
    if (to) {
      query = query.lte('placed_at', to);
    }

    const { data: bets, error, count } = await query;

    if (error) {
      console.error('Error fetching bets:', error);
      return NextResponse.json({ error: 'Failed to fetch bets' }, { status: 500 });
    }

    return NextResponse.json({
      bets,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Bets API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/bets - Create a single bet
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = betSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: parsed.error.issues 
      }, { status: 400 });
    }

    const betData = {
      ...parsed.data,
      user_id: user.id,
    };

    const { data: bet, error } = await supabase
      .from('bets')
      .insert(betData)
      .select()
      .single();

    if (error) {
      console.error('Error creating bet:', error);
      return NextResponse.json({ error: 'Failed to create bet' }, { status: 500 });
    }

    return NextResponse.json({ bet }, { status: 201 });
  } catch (error) {
    console.error('Bets API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
