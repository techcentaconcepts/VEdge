import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/alerts/send - Send alert to user
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { opportunity_id, channel = 'push' } = body;

    // Get opportunity details
    const { data: opportunity, error: oppError } = await supabase
      .from('value_opportunities')
      .select('*')
      .eq('match_id', opportunity_id)
      .single();

    if (oppError || !opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Log the alert
    const { error: logError } = await supabase
      .from('alert_log')
      .insert({
        user_id: user.id,
        opportunity_id,
        channel,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('Failed to log alert:', logError);
    }

    // TODO: Implement actual alert delivery (Telegram, email, push)
    // For now, just return success
    return NextResponse.json({
      success: true,
      message: `Alert sent via ${channel}`,
      opportunity: {
        match: opportunity.match_name,
        edge: opportunity.best_edge_percent,
        market: opportunity.best_edge_market,
      },
    });
  } catch (error) {
    console.error('Alert API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/alerts - Get user's alert history
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: alerts, error } = await supabase
      .from('alert_log')
      .select('*')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to fetch alerts:', error);
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Alert API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
