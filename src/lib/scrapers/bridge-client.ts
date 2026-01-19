/**
 * Bridge Client - TypeScript client for the NaijaBet Bridge service
 * 
 * This replaces direct Puppeteer scraping with API calls to the FastAPI bridge
 */

export interface BridgeMatch {
  id: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  odds: {
    home?: number;
    draw?: number;
    away?: number;
    [key: string]: any;
  };
}

export interface BridgeResponse {
  bookmaker: string;
  league: string;
  matches: BridgeMatch[];
  timestamp: string;
  count: number;
  error?: string;
}

export interface BridgeAllBookmakersResponse {
  league: string;
  timestamp: string;
  bookmakers: {
    bet9ja?: BridgeResponse;
    betking?: BridgeResponse;
    sportybet?: BridgeResponse;
  };
}

export type Bookmaker = 'bet9ja' | 'betking' | 'sportybet';

export type League = 
  | 'premierleague' 
  | 'laliga' 
  | 'seriea' 
  | 'bundesliga'
  | 'ligue1'
  | 'npfl'
  | 'ucl'
  | 'europa';

export class BridgeClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Use environment variable or default to local
    this.baseUrl = baseUrl || process.env.NAIJA_BRIDGE_URL || 'http://localhost:8000';
  }

  /**
   * Fetch odds from a specific bookmaker
   */
  async fetchOdds(bookmaker: Bookmaker, league: League): Promise<BridgeResponse> {
    const url = `${this.baseUrl}/api/odds/${bookmaker}/${league}`;
    
    try {
      console.log(`🌉 Fetching from bridge: ${bookmaker}/${league}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // 60 second timeout for scraping
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bridge error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data as BridgeResponse;

    } catch (error: any) {
      console.error(`❌ Bridge fetch error (${bookmaker}/${league}):`, error);
      throw error;
    }
  }

  /**
   * Fetch odds from all bookmakers for a league
   */
  async fetchAllBookmakers(league: League): Promise<BridgeAllBookmakersResponse> {
    const url = `${this.baseUrl}/api/odds/all/${league}`;
    
    try {
      console.log(`🌉 Fetching all bookmakers: ${league}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(90000), // 90s for multiple bookmakers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bridge error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data as BridgeAllBookmakersResponse;

    } catch (error: any) {
      console.error(`❌ Bridge fetch all error (${league}):`, error);
      throw error;
    }
  }

  /**
   * Health check for the bridge service
   */
  async healthCheck(): Promise<{ status: string; naijabet_available: boolean }> {
    const url = `${this.baseUrl}/health`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('❌ Bridge health check failed:', error);
      throw error;
    }
  }

  /**
   * Normalize bridge data to match existing OddsData format
   */
  normalizeToOddsData(bridgeData: BridgeResponse): any[] {
    return bridgeData.matches.map(match => ({
      id: match.id,
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      startTime: match.kickoff,
      odds: {
        home: match.odds.home,
        draw: match.odds.draw,
        away: match.odds.away,
      },
      bookmaker: bridgeData.bookmaker,
      league: bridgeData.league,
      scrapedAt: bridgeData.timestamp,
    }));
  }
}

// Export singleton instance
export const bridgeClient = new BridgeClient();

// Export utility functions
export async function getBet9jaOdds(league: League): Promise<BridgeResponse> {
  return bridgeClient.fetchOdds('bet9ja', league);
}

export async function getBetKingOdds(league: League): Promise<BridgeResponse> {
  return bridgeClient.fetchOdds('betking', league);
}

export async function getSportyBetOdds(league: League): Promise<BridgeResponse> {
  return bridgeClient.fetchOdds('sportybet', league);
}

export async function getAllBookmakersOdds(league: League): Promise<BridgeAllBookmakersResponse> {
  return bridgeClient.fetchAllBookmakers(league);
}
