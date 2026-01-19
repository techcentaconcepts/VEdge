// Odds Scraper Framework for Nigerian Bookmakers
// Scrapes odds from soft bookmakers (Bet9ja, SportyBet, BetKing)

export interface OddsData {
  matchId: string;
  matchName: string;
  sport: string;
  league: string;
  kickoffTime: string;
  bookmaker: string;
  market: string;
  selection: string;
  odds: number;
  isSharp: boolean;
  scrapedAt: string;
}

export interface Match {
  id: string;
  name: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
}

// Base scraper class
export abstract class BookmakerScraper {
  protected bookmaker: string;
  protected isSharp: boolean;

  constructor(bookmaker: string, isSharp: boolean = false) {
    this.bookmaker = bookmaker;
    this.isSharp = isSharp;
  }

  abstract scrapeMatches(sport: string): Promise<Match[]>;
  abstract scrapeOdds(matchId: string, markets: string[]): Promise<OddsData[]>;
  
  // Normalize team names for matching
  protected normalizeTeamName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/fc$/i, '')
      .replace(/\s+fc\s+/i, ' ')
      .replace(/\s+afc\s+/i, ' ')
      .trim();
  }

  // Generate match ID from team names
  protected generateMatchId(homeTeam: string, awayTeam: string, kickoff: string): string {
    const home = this.normalizeTeamName(homeTeam);
    const away = this.normalizeTeamName(awayTeam);
    const date = new Date(kickoff).toISOString().split('T')[0];
    return `${home}_vs_${away}_${date}`.replace(/\s/g, '_');
  }
}

// Bet9ja Scraper
export class Bet9jaScraper extends BookmakerScraper {
  constructor() {
    super('bet9ja', false);
  }

  async scrapeMatches(sport: string = 'football'): Promise<Match[]> {
    // This would use Puppeteer/Playwright in production
    // For now, returning mock data structure
    const matches: Match[] = [];
    
    // In production, this would scrape from Bet9ja's website
    // Using selectors like:
    // - '.event-row' for match containers
    // - '.team-home' and '.team-away' for team names
    // - '.kickoff-time' for match start time
    
    return matches;
  }

  async scrapeOdds(matchId: string, markets: string[] = ['1X2', 'Over/Under 2.5']): Promise<OddsData[]> {
    const oddsData: OddsData[] = [];
    
    // In production, this would scrape odds for specified markets
    // Example markets: Match Winner (1X2), Over/Under, Both Teams to Score
    
    return oddsData;
  }
}

// SportyBet Scraper
export class SportyBetScraper extends BookmakerScraper {
  constructor() {
    super('sportybet', false);
  }

  async scrapeMatches(sport: string = 'football'): Promise<Match[]> {
    // Similar structure to Bet9ja scraper
    return [];
  }

  async scrapeOdds(matchId: string, markets: string[]): Promise<OddsData[]> {
    return [];
  }
}

// BetKing Scraper
export class BetKingScraper extends BookmakerScraper {
  constructor() {
    super('betking', false);
  }

  async scrapeMatches(sport: string = 'football'): Promise<Match[]> {
    return [];
  }

  async scrapeOdds(matchId: string, markets: string[]): Promise<OddsData[]> {
    return [];
  }
}

// Odds comparison service
export class OddsComparisonService {
  private scrapers: BookmakerScraper[];

  constructor(scrapers: BookmakerScraper[]) {
    this.scrapers = scrapers;
  }

  // Scrape all bookmakers and compare odds
  async compareOdds(sport: string = 'football', markets: string[] = ['1X2']): Promise<Map<string, OddsData[]>> {
    const allMatches = new Map<string, Match>();
    
    // Step 1: Scrape matches from all bookmakers
    for (const scraper of this.scrapers) {
      const matches = await scraper.scrapeMatches(sport);
      matches.forEach(match => {
        if (!allMatches.has(match.id)) {
          allMatches.set(match.id, match);
        }
      });
    }

    // Step 2: Scrape odds for each match
    const oddsMap = new Map<string, OddsData[]>();
    
    for (const [matchId, match] of allMatches) {
      const matchOdds: OddsData[] = [];
      
      for (const scraper of this.scrapers) {
        try {
          const odds = await scraper.scrapeOdds(matchId, markets);
          matchOdds.push(...odds);
        } catch (error) {
          console.error(`Failed to scrape ${matchId} from ${scraper}:`, error);
        }
      }
      
      if (matchOdds.length > 0) {
        oddsMap.set(matchId, matchOdds);
      }
    }

    return oddsMap;
  }

  // Find value opportunities
  findValueBets(oddsMap: Map<string, OddsData[]>, minEdge: number = 3): ValueOpportunity[] {
    const opportunities: ValueOpportunity[] = [];

    for (const [matchId, oddsData] of oddsMap) {
      // Group odds by market and selection
      const oddsGroups = new Map<string, OddsData[]>();
      
      oddsData.forEach(odd => {
        const key = `${odd.market}|${odd.selection}`;
        if (!oddsGroups.has(key)) {
          oddsGroups.set(key, []);
        }
        oddsGroups.get(key)!.push(odd);
      });

      // Compare sharp vs soft odds
      for (const [key, odds] of oddsGroups) {
        const sharpOdds = odds.filter(o => o.isSharp);
        const softOdds = odds.filter(o => !o.isSharp);

        if (sharpOdds.length === 0 || softOdds.length === 0) continue;

        // Use best sharp odds (lowest, most efficient)
        const bestSharp = sharpOdds.reduce((best, current) => 
          current.odds < best.odds ? current : best
        );

        // Find soft bookmakers with higher odds
        for (const soft of softOdds) {
          const edge = this.calculateEdge(bestSharp.odds, soft.odds);
          
          if (edge >= minEdge) {
            opportunities.push({
              id: crypto.randomUUID(),
              matchId: soft.matchId,
              matchName: soft.matchName,
              sport: soft.sport,
              league: soft.league,
              kickoffTime: soft.kickoffTime,
              market: soft.market,
              selection: soft.selection,
              sharpBookmaker: bestSharp.bookmaker,
              sharpOdds: bestSharp.odds,
              softBookmaker: soft.bookmaker,
              softOdds: soft.odds,
              edgePercent: edge,
              kellyFraction: this.calculateKelly(bestSharp.odds, soft.odds, edge),
              status: 'active',
              detectedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    return opportunities.sort((a, b) => b.edgePercent - a.edgePercent);
  }

  // Calculate edge percentage
  private calculateEdge(sharpOdds: number, softOdds: number): number {
    const trueProbability = 1 / sharpOdds;
    const impliedProbability = 1 / softOdds;
    return ((trueProbability - impliedProbability) / impliedProbability) * 100;
  }

  // Calculate Kelly Criterion stake fraction
  private calculateKelly(sharpOdds: number, softOdds: number, edge: number): number {
    const probability = 1 / sharpOdds;
    const decimalOdds = softOdds;
    const kelly = ((probability * decimalOdds - 1) / (decimalOdds - 1));
    return Math.max(0, Math.min(kelly * 0.25, 0.05)); // Quarter Kelly, max 5% of bankroll
  }
}

export interface ValueOpportunity {
  id: string;
  matchId: string;
  matchName: string;
  sport: string;
  league: string;
  kickoffTime: string;
  market: string;
  selection: string;
  sharpBookmaker: string;
  sharpOdds: number;
  softBookmaker: string;
  softOdds: number;
  edgePercent: number;
  kellyFraction: number;
  status: 'active' | 'expired' | 'odds_moved';
  detectedAt: string;
  expiredAt?: string;
  betLink?: string;
}
