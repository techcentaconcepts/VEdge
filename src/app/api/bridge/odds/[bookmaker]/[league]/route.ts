import { NextRequest, NextResponse } from 'next/server';

const BRIDGE_URL = process.env.NAIJA_BRIDGE_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for scraping

/**
 * GET /api/bridge/odds/[bookmaker]/[league]
 * 
 * Fetches odds from Nigerian bookmakers via the FastAPI bridge service
 * 
 * @param bookmaker - bet9ja, betking, sportybet, or 'all'
 * @param league - premierleague, laliga, npfl, etc.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { bookmaker: string; league: string } }
) {
  try {
    const { bookmaker, league } = params;

    // Validate bookmaker
    const validBookmakers = ['bet9ja', 'betking', 'sportybet', 'all'];
    if (!validBookmakers.includes(bookmaker.toLowerCase())) {
      return NextResponse.json(
        { 
          error: 'Invalid bookmaker',
          valid_bookmakers: validBookmakers
        },
        { status: 400 }
      );
    }

    // Validate league
    const validLeagues = [
      'premierleague', 'laliga', 'seriea', 'bundesliga', 
      'ligue1', 'npfl', 'ucl', 'europa'
    ];
    if (!validLeagues.includes(league.toLowerCase())) {
      return NextResponse.json(
        { 
          error: 'Invalid league',
          valid_leagues: validLeagues
        },
        { status: 400 }
      );
    }

    console.log(`🌉 Bridge request: ${bookmaker}/${league}`);

    // Call the FastAPI bridge
    const bridgeUrl = `${BRIDGE_URL}/api/odds/${bookmaker}/${league}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout

    try {
      const response = await fetch(bridgeUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Bridge error (${response.status}):`, errorText);
        
        return NextResponse.json(
          { 
            error: 'Bridge service error',
            status: response.status,
            details: errorText,
            bridge_url: BRIDGE_URL
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      
      console.log(`✅ Bridge success: ${bookmaker}/${league} - ${data.count || 0} matches`);

      return NextResponse.json(data);

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('⏱️ Bridge timeout');
        return NextResponse.json(
          { 
            error: 'Bridge request timeout',
            message: 'Scraping took too long. This can happen on cold starts.',
            bridge_url: BRIDGE_URL
          },
          { status: 504 }
        );
      }

      throw fetchError;
    }

  } catch (error: any) {
    console.error('❌ Bridge API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message,
        bridge_url: BRIDGE_URL,
        hint: 'Make sure NAIJA_BRIDGE_URL is set and the bridge service is running'
      },
      { status: 500 }
    );
  }
}
