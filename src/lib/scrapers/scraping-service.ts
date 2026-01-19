// Scraping Service - Orchestrates all scrapers and stores data
import { createClient } from '@/lib/supabase/server';
import { Bet9jaPuppeteerScraper, SportyBetPuppeteerScraper, BetKingPuppeteerScraper } from './puppeteer-scrapers';
import { PinnacleSharpOdds, CloudbetSharpOdds } from './sharp-odds-api';
import type { OddsData, Match } from './odds-scraper';

export interface ScrapingResult {
  success: boolean;
  matchesScraped: number;
  oddsScraped: number;
  opportunitiesDetected: number;
  errors: string[];
  duration: number;
  timestamp: string;
}

export class OddsScrapingService {
  private bet9jaScraper: Bet9jaPuppeteerScraper;
  private sportybetScraper: SportyBetPuppeteerScraper;
  private betkingScraper: BetKingPuppeteerScraper;
  private pinnacleApi: PinnacleSharpOdds;
  private cloudbetApi: CloudbetSharpOdds;

  constructor() {
    this.bet9jaScraper = new Bet9jaPuppeteerScraper();
    this.sportybetScraper = new SportyBetPuppeteerScraper();
    this.betkingScraper = new BetKingPuppeteerScraper();
    this.pinnacleApi = new PinnacleSharpOdds();
    this.cloudbetApi = new CloudbetSharpOdds();
  }

  async runFullScrape(sport: string = 'football'): Promise<ScrapingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let matchesScraped = 0;
    let oddsScraped = 0;
    let opportunitiesDetected = 0;

    try {
      console.log(`[ScrapingService] Starting full scrape for ${sport}...`);

      // Step 1: Get sharp odds from Pinnacle/Cloudbet
      const sharpOdds = await this.scrapeSharpOdds(sport);
      console.log(`[ScrapingService] Scraped ${sharpOdds.length} sharp odds`);
      oddsScraped += sharpOdds.length;

      // Step 2: Get soft bookmaker odds from Nigerian bookmakers
      const softOdds = await this.scrapeSoftBookmakers(sport);
      console.log(`[ScrapingService] Scraped ${softOdds.length} soft odds`);
      oddsScraped += softOdds.length;

      // Step 3: Store all odds in database
      const storedCount = await this.storeOdds([...sharpOdds, ...softOdds]);
      console.log(`[ScrapingService] Stored ${storedCount} odds in database`);

      // Step 4: Detect value opportunities
      const opportunities = await this.detectValueOpportunities();
      opportunitiesDetected = opportunities;
      console.log(`[ScrapingService] Detected ${opportunitiesDetected} value opportunities`);

      // Step 5: Cleanup old odds (older than 1 hour)
      await this.cleanupOldOdds();

      const duration = Date.now() - startTime;

      return {
        success: true,
        matchesScraped,
        oddsScraped,
        opportunitiesDetected,
        errors,
        duration,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      console.error('[ScrapingService] Scraping failed:', error);

      return {
        success: false,
        matchesScraped,
        oddsScraped,
        opportunitiesDetected,
        errors,
        duration,
        timestamp: new Date().toISOString(),
      };
    } finally {
      // Cleanup scrapers
      await this.cleanup();
    }
  }

  private async scrapeSharpOdds(sport: string): Promise<OddsData[]> {
    const allOdds: OddsData[] = [];

    try {
      // Try Pinnacle via OddsAPI (requires API key)
      const pinnacleOdds = await this.pinnacleApi.getSharpOddsFromAPI(sport);
      allOdds.push(...pinnacleOdds);
    } catch (error) {
      console.error('Failed to scrape Pinnacle:', error);
    }

    try {
      // Try Cloudbet as backup
      if (allOdds.length === 0) {
        const cloudbetMatches = await this.cloudbetApi.getFixtures(sport);
        // Note: Need to implement getOdds for Cloudbet
        console.log(`Found ${cloudbetMatches.length} matches from Cloudbet`);
      }
    } catch (error) {
      console.error('Failed to scrape Cloudbet:', error);
    }

    return allOdds;
  }

  private async scrapeSoftBookmakers(sport: string): Promise<OddsData[]> {
    const allOdds: OddsData[] = [];
    const markets = ['1X2', 'Over/Under 2.5', 'Both Teams to Score'];

    // Scrape Bet9ja
    try {
      const bet9jaMatches = await this.bet9jaScraper.scrapeMatches(sport);
      console.log(`[Bet9ja] Found ${bet9jaMatches.length} matches`);

      for (const match of bet9jaMatches.slice(0, 10)) { // Limit to 10 matches for testing
        const odds = await this.bet9jaScraper.scrapeOdds(match.id, markets);
        allOdds.push(...odds);
      }
    } catch (error) {
      console.error('Failed to scrape Bet9ja:', error);
    }

    // Scrape SportyBet
    try {
      const sportybetMatches = await this.sportybetScraper.scrapeMatches(sport);
      console.log(`[SportyBet] Found ${sportybetMatches.length} matches`);

      for (const match of sportybetMatches.slice(0, 10)) {
        const odds = await this.sportybetScraper.scrapeOdds(match.id, markets);
        allOdds.push(...odds);
      }
    } catch (error) {
      console.error('Failed to scrape SportyBet:', error);
    }

    // Scrape BetKing
    try {
      const betkingMatches = await this.betkingScraper.scrapeMatches(sport);
      console.log(`[BetKing] Found ${betkingMatches.length} matches`);

      for (const match of betkingMatches.slice(0, 10)) {
        const odds = await this.betkingScraper.scrapeOdds(match.id, markets);
        allOdds.push(...odds);
      }
    } catch (error) {
      console.error('Failed to scrape BetKing:', error);
    }

    return allOdds;
  }

  private async storeOdds(oddsData: OddsData[]): Promise<number> {
    try {
      const supabase = await createClient();
      let storedCount = 0;

      // Store odds in batches
      const batchSize = 50;
      for (let i = 0; i < oddsData.length; i += batchSize) {
        const batch = oddsData.slice(i, i + batchSize);

        for (const odds of batch) {
          const { error } = await supabase.rpc('store_odds_snapshot', {
            p_match_id: odds.matchId,
            p_match_name: odds.matchName,
            p_sport: odds.sport,
            p_league: odds.league,
            p_kickoff_time: odds.kickoffTime,
            p_bookmaker: odds.bookmaker,
            p_market: odds.market,
            p_selection: odds.selection,
            p_odds: odds.odds,
            p_is_sharp: odds.isSharp,
          });

          if (!error) {
            storedCount++;
          } else {
            console.error('Error storing odds:', error);
          }
        }
      }

      return storedCount;
    } catch (error) {
      console.error('Error in storeOdds:', error);
      return 0;
    }
  }

  private async detectValueOpportunities(): Promise<number> {
    try {
      const supabase = await createClient();
      
      // Call the detect_value_opportunities function
      const { data, error } = await supabase.rpc('detect_value_opportunities', {
        p_min_edge: 2.0, // Minimum 2% edge
        p_sport: 'football',
      });

      if (error) {
        console.error('Error detecting opportunities:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error in detectValueOpportunities:', error);
      return 0;
    }
  }

  private async cleanupOldOdds(): Promise<void> {
    try {
      const supabase = await createClient();
      
      // Call cleanup function (keeps odds from last hour)
      await supabase.rpc('cleanup_old_odds_snapshots', {
        p_hours_to_keep: 1,
      });
    } catch (error) {
      console.error('Error cleaning up old odds:', error);
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await Promise.all([
        this.bet9jaScraper.close(),
        this.sportybetScraper.close(),
        this.betkingScraper.close(),
      ]);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Scheduler for automated scraping
export class ScrapingScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private service: OddsScrapingService;
  private isRunning = false;

  constructor() {
    this.service = new OddsScrapingService();
  }

  start(intervalMinutes: number = 2): void {
    if (this.isRunning) {
      console.warn('Scheduler already running');
      return;
    }

    console.log(`[Scheduler] Starting scraping every ${intervalMinutes} minutes`);
    this.isRunning = true;

    // Run immediately
    this.runScrape();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.runScrape();
    }, intervalMinutes * 60 * 1000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('[Scheduler] Stopped scraping');
    }
  }

  private async runScrape(): Promise<void> {
    try {
      console.log('[Scheduler] Running scheduled scrape...');
      const result = await this.service.runFullScrape('football');
      
      console.log('[Scheduler] Scrape completed:', {
        success: result.success,
        oddsScraped: result.oddsScraped,
        opportunities: result.opportunitiesDetected,
        duration: `${(result.duration / 1000).toFixed(2)}s`,
      });

      if (result.errors.length > 0) {
        console.error('[Scheduler] Errors:', result.errors);
      }
    } catch (error) {
      console.error('[Scheduler] Scrape failed:', error);
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
