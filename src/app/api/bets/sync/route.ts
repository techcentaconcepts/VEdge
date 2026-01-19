import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for batch sync
const betSchema = z.object({
  external_bet_id: z.string().optional(),
  bookmaker: z.string(),
  sport: z.string().default('football'),
  league: z.string().optional(),
  match_name: z.string(),
  market: z.string(),
  selection: z.string(),
  odds: z.number().positive(),
  stake: z.number().positive(),
  currency: z.string().default('NGN'),
  outcome: z.enum(['pending', 'won', 'lost', 'void', 'cashout']).optional().nullable(),
  profit_loss: z.number().optional().nullable(),
  closing_odds: z.number().optional().nullable(),
  placed_at: z.string(),
  settled_at: z.string().optional().nullable(),
  synced_from: z.enum(['extension', 'manual', 'api']).default('extension'),
});

const batchSyncSchema = z.object({
  bets: z.array(betSchema).min(1).max(100),
});

// POST /api/bets/sync - Batch sync bets from extension
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = batchSyncSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: parsed.error.issues 
      }, { status: 400 });
    }

    const betsToSync = parsed.data.bets.map(bet => ({
      ...bet,
      user_id: user.id,
      placed_at: new Date(bet.placed_at).toISOString(),
      settled_at: bet.settled_at ? new Date(bet.settled_at).toISOString() : null,
    }));

    // Upsert bets (update if external_bet_id exists, insert if new)
    const { data: syncedBets, error } = await supabase
      .from('bets')
      .upsert(betsToSync, {
        onConflict: 'user_id,external_bet_id,bookmaker',
        ignoreDuplicates: false,
      })
      .select('id, external_bet_id');

    if (error) {
      console.error('Error syncing bets:', error);
      return NextResponse.json({ error: 'Failed to sync bets' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      synced_count: syncedBets?.length || 0,
      synced_ids: syncedBets?.map((b) => b.external_bet_id).filter(Boolean) || [],
    });
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
