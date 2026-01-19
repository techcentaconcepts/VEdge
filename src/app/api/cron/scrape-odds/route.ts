// API Route for automated scraping via cron job
// Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
// Add to vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/scrape-odds",
//     "schedule": "*/2 * * * *"
//   }]
// }

import { NextRequest, NextResponse } from 'next/server';
// import { OddsScrapingService } from '@/lib/scrapers/scraping-service';

export const maxDuration = 300; // 5 minutes timeout for scraping
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] Starting scheduled odds scraping...');

    // TODO: Integrate with FastAPI bridge service instead of Puppeteer
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      message: 'Cron scraping temporarily disabled. Use FastAPI bridge service endpoints.',
      note: 'Configure Railway bridge to run on schedule instead',
    });

    // const service = new OddsScrapingService();
    // const result = await service.runFullScrape('football');

    // console.log('[Cron] Scraping completed:', {
    //   success: result.success,
    //   oddsScraped: result.oddsScraped,
    //   opportunities: result.opportunitiesDetected,
    //   duration: `${(result.duration / 1000).toFixed(2)}s`,
    // });

    // return NextResponse.json({
    //   success: true,
    //   message: 'Scraping completed successfully',
    //   result,
    // });

  } catch (error) {
    console.error('[Cron] Scraping failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
      },
      { status: 500 }
    );
  }
}
