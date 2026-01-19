// API Route for manual scraping trigger
// Allows admin users to trigger scraping on demand

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
// import { OddsScrapingService } from '@/lib/scrapers/scraping-service';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated and is admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get optional parameters
    const body = await request.json().catch(() => ({}));
    const sport = body.sport || 'football';

    console.log(`[Manual Scrape] Admin ${user.email} triggered scraping for ${sport}`);

    // TODO: Integrate with FastAPI bridge service instead of Puppeteer
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      message: 'Scraping endpoint temporarily disabled. Please use the FastAPI bridge service.',
      note: 'See /api/bridge/odds/[bookmaker]/[league] endpoints',
    });

    // // Run scraping
    // const service = new OddsScrapingService();
    // const result = await service.runFullScrape(sport);

    // // Run scraping
    // const service = new OddsScrapingService();
    // const result = await service.runFullScrape(sport);

    // // Log the activity
    // await supabase.from('admin_activity_log').insert({
    //   user_id: user.id,
    //   action: 'trigger_scraping',
    //   details: {
    //     sport,
    //     result: {
    //       oddsScraped: result.oddsScraped,
    //       opportunitiesDetected: result.opportunitiesDetected,
    //       duration: result.duration,
    //     },
    //   },
    // });

    // return NextResponse.json({
    //   success: true,
    //   message: 'Scraping completed successfully',
    //   result,
    // });

  } catch (error) {
    console.error('[Manual Scrape] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check scraping status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get latest scraping results from database
    const { data: latestOdds } = await supabase
      .from('odds_snapshots')
      .select('scraped_at, bookmaker')
      .order('scraped_at', { ascending: false })
      .limit(1);

    const { data: opportunityCount } = await supabase
      .from('value_opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    return NextResponse.json({
      lastScrape: latestOdds?.[0]?.scraped_at || null,
      activeOpportunities: opportunityCount || 0,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
