import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/bets/[id] - Get a single bet
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: bet, error } = await supabase
      .from('bets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Bet not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ bet });
  } catch (error: any) {
    console.error('Error fetching bet:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bet' },
      { status: 500 }
    );
  }
}

// PUT /api/bets/[id] - Update a bet
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Prepare update data
    const updateData: any = {};
    
    if (body.outcome !== undefined) updateData.outcome = body.outcome;
    if (body.profit !== undefined) updateData.profit = parseFloat(body.profit);
    if (body.closing_odds !== undefined) updateData.closing_odds = parseFloat(body.closing_odds);
    if (body.settled_at !== undefined) updateData.settled_at = body.settled_at;
    if (body.notes !== undefined) updateData.notes = body.notes;
    
    // If settling bet, calculate profit if not provided
    if (body.outcome === 'won' && body.profit === undefined) {
      const { data: currentBet } = await supabase
        .from('bets')
        .select('stake, odds')
        .eq('id', id)
        .single();
      
      if (currentBet) {
        updateData.profit = (currentBet.stake * currentBet.odds) - currentBet.stake;
        updateData.settled_at = new Date().toISOString();
      }
    } else if (body.outcome === 'lost' && body.profit === undefined) {
      const { data: currentBet } = await supabase
        .from('bets')
        .select('stake')
        .eq('id', id)
        .single();
      
      if (currentBet) {
        updateData.profit = -currentBet.stake;
        updateData.settled_at = new Date().toISOString();
      }
    }

    const { data: bet, error } = await supabase
      .from('bets')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Bet not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ bet });
  } catch (error: any) {
    console.error('Error updating bet:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update bet' },
      { status: 500 }
    );
  }
}

// DELETE /api/bets/[id] - Delete a bet
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('bets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting bet:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete bet' },
      { status: 500 }
    );
  }
}
