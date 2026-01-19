// Pinnacle API Integration for Sharp Odds
// Pinnacle provides one of the most efficient markets in sports betting

import type { OddsData, Match } from './odds-scraper';

interface PinnacleFixture {
  id: number;
  starts: string;
  home: string;
  away: string;
  league: {
    id: number;
    name: string;
  };
  sport: {
    id: number;
    name: string;
  };
}

interface PinnacleOdds {
  price: number;
  designation?: string;
  points?: number;
}

interface PinnacleMarket {
  key: string;
  period: number;
  cutoff: string;
  prices: PinnacleOdds[];
}

export class PinnacleSharpOdds {
  private bookmaker = 'pinnacle';
  private isSharp = true;

  // Note: Pinnacle's API requires authentication
  // For production, you'll need API credentials from Pinnacle
  // This implementation shows the structure

  async getFixtures(sport: string = 'soccer', league?: string): Promise<Match[]> {
    try {
      // Pinnacle API endpoint structure (requires auth)
      // GET https://api.pinnacle.com/v2/fixtures
      
      const matches: Match[] = [];

      // In production, make authenticated API call:
      // const response = await fetch('https://api.pinnacle.com/v2/fixtures', {
      //   headers: {
      //     'Authorization': `Basic ${Buffer.from('username:password').toString('base64')}`,
      //     'Content-Type': 'application/json',
      //   },
      //   method: 'GET',
      // });

      // For now, return empty array
      // You'll need to sign up for Pinnacle API access
      
      return matches;
    } catch (error) {
      console.error('Error fetching Pinnacle fixtures:', error);
      return [];
    }
  }

  async getOdds(fixtureId: number, markets: string[] = ['moneyline', 'spread', 'totals']): Promise<OddsData[]> {
    try {
      const oddsData: OddsData[] = [];

      // Pinnacle API endpoint for odds
      // GET https://api.pinnacle.com/v2/odds
      // Params: sportId, leagueId, oddsFormat=DECIMAL, etc.

      // Example response structure:
      // {
      //   "sportId": 29,
      //   "leagues": [{
      //     "id": 12345,
      //     "events": [{
      //       "id": 123456789,
      //       "periods": [{
      //         "number": 0,
      //         "cutoff": "2026-01-19T18:00:00Z",
      //         "moneyline": {
      //           "home": 1.85,
      //           "away": 2.10,
      //           "draw": 3.40
      //         },
      //         "totals": [{
      //           "points": 2.5,
      //           "over": 1.95,
      //           "under": 1.90
      //         }]
      //       }]
      //     }]
      //   }]
      // }

      return oddsData;
    } catch (error) {
      console.error('Error fetching Pinnacle odds:', error);
      return [];
    }
  }

  // Alternative: Use OddsAPI.io which aggregates Pinnacle data
  async getSharpOddsFromAPI(sport: string = 'soccer'): Promise<OddsData[]> {
    try {
      // OddsAPI.io provides sharp bookmaker data including Pinnacle
      // GET https://api.the-odds-api.com/v4/sports/{sport}/odds
      // Params: apiKey, regions=us, markets=h2h,spreads,totals, bookmakers=pinnacle

      const apiKey = process.env.ODDS_API_KEY;
      if (!apiKey) {
        console.warn('ODDS_API_KEY not set - cannot fetch sharp odds');
        return [];
      }

      const sportKey = this.mapSportToOddsAPI(sport);
      const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`);
      url.searchParams.set('apiKey', apiKey);
      url.searchParams.set('regions', 'us,uk,eu');
      url.searchParams.set('markets', 'h2h,spreads,totals');
      url.searchParams.set('bookmakers', 'pinnacle');
      url.searchParams.set('oddsFormat', 'decimal');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`OddsAPI returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const oddsData: OddsData[] = [];

      // Parse OddsAPI response
      for (const event of data) {
        const matchId = this.generateMatchId(
          event.home_team,
          event.away_team,
          event.commence_time
        );

        for (const bookmaker of event.bookmakers) {
          if (bookmaker.key !== 'pinnacle') continue;

          for (const market of bookmaker.markets) {
            const marketName = this.mapMarketName(market.key);

            for (const outcome of market.outcomes) {
              oddsData.push({
                matchId,
                matchName: `${event.home_team} vs ${event.away_team}`,
                sport: event.sport_title,
                league: event.league || 'Unknown',
                kickoffTime: event.commence_time,
                bookmaker: 'pinnacle',
                market: marketName,
                selection: outcome.name,
                odds: outcome.price,
                isSharp: true,
                scrapedAt: new Date().toISOString(),
              });
            }
          }
        }
      }

      console.log(`Fetched ${oddsData.length} sharp odds from Pinnacle via OddsAPI`);
      return oddsData;

    } catch (error) {
      console.error('Error fetching sharp odds from OddsAPI:', error);
      return [];
    }
  }

  private mapSportToOddsAPI(sport: string): string {
    const mapping: Record<string, string> = {
      'football': 'soccer_epl', // English Premier League
      'soccer': 'soccer_epl',
      'basketball': 'basketball_nba',
      'tennis': 'tennis_atp',
    };
    return mapping[sport.toLowerCase()] || 'soccer_epl';
  }

  private mapMarketName(oddsApiMarket: string): string {
    const mapping: Record<string, string> = {
      'h2h': 'Match Winner',
      'spreads': 'Handicap',
      'totals': 'Over/Under 2.5',
    };
    return mapping[oddsApiMarket] || oddsApiMarket;
  }

  private normalizeTeamName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  private generateMatchId(homeTeam: string, awayTeam: string, kickoff: string): string {
    const home = this.normalizeTeamName(homeTeam);
    const away = this.normalizeTeamName(awayTeam);
    const date = kickoff.split('T')[0].replace(/-/g, '');
    return `${home}_vs_${away}_${date}`;
  }
}

// Cloudbet API (another sharp bookmaker option)
export class CloudbetSharpOdds {
  private bookmaker = 'cloudbet';
  private baseUrl = 'https://www.cloudbet.com/api';

  async getFixtures(sport: string = 'soccer'): Promise<Match[]> {
    try {
      // Cloudbet has a public API for odds
      const sportKey = sport === 'football' ? 'soccer' : sport;
      const response = await fetch(
        `${this.baseUrl}/pub/v2/odds/competitions/${sportKey}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Cloudbet API error: ${response.status}`);
      }

      const data = await response.json();
      const matches: Match[] = [];

      // Parse Cloudbet response structure
      for (const competition of data.competitions || []) {
        for (const event of competition.events || []) {
          matches.push({
            id: this.generateMatchId(
              event.home.name,
              event.away.name,
              event.cutoffTime
            ),
            name: `${event.home.name} vs ${event.away.name}`,
            sport: competition.sport.name,
            league: competition.name,
            homeTeam: event.home.name,
            awayTeam: event.away.name,
            kickoff: event.cutoffTime,
          });
        }
      }

      return matches;
    } catch (error) {
      console.error('Error fetching Cloudbet fixtures:', error);
      return [];
    }
  }

  async getOdds(matchId: string): Promise<OddsData[]> {
    // Similar structure to getFixtures
    return [];
  }

  private generateMatchId(homeTeam: string, awayTeam: string, kickoff: string): string {
    const home = homeTeam.toLowerCase().replace(/\s+/g, '_');
    const away = awayTeam.toLowerCase().replace(/\s+/g, '_');
    const date = kickoff.split('T')[0].replace(/-/g, '');
    return `${home}_vs_${away}_${date}`;
  }
}
