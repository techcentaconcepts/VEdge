// Real Puppeteer-based odds scraping implementation
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import chromium from '@sparticuz/chromium';
import type { OddsData, Match, BookmakerScraper as IBookmakerScraper } from './odds-scraper';

// Apply stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Check if running on Vercel serverless
const isProduction = process.env.NODE_ENV === 'production';

export class Bet9jaPuppeteerScraper {
  private browser: Browser | null = null;
  private bookmaker = 'bet9ja';
  private baseUrl = 'https://web.bet9ja.com';

  async init(): Promise<void> {
    if (!this.browser) {
      if (isProduction) {
        // Use Chromium for serverless (Vercel)
        this.browser = await puppeteer.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        });
      } else {
        // Use local Chromium for development
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920x1080',
          ],
        });
      }
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeMatches(sport: string = 'football'): Promise<Match[]> {
    await this.init();
    const page = await this.browser!.newPage();
    const matches: Match[] = [];

    try {
      // Set realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Navigate to football page
      const sportUrl = sport === 'football' 
        ? `${this.baseUrl}/Sport/Football.aspx`
        : `${this.baseUrl}/Sport/${sport}.aspx`;
      
      await page.goto(sportUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for matches to load
      await page.waitForSelector('.events-list, .event-item, [class*="event"]', {
        timeout: 10000,
      }).catch(() => console.log('No events selector found'));

      // Extract matches
      const scrapedMatches = await page.evaluate(() => {
        const matchElements = document.querySelectorAll(
          '.event-item, [class*="event-row"], .match-row, [data-event-id]'
        );
        
        const results: any[] = [];

        matchElements.forEach((element) => {
          try {
            // Try different selectors for team names
            const homeTeam = 
              element.querySelector('.team-home, .home-team, [class*="home"]')?.textContent?.trim() ||
              element.querySelector('.teams span:first-child')?.textContent?.trim() ||
              '';
            
            const awayTeam = 
              element.querySelector('.team-away, .away-team, [class*="away"]')?.textContent?.trim() ||
              element.querySelector('.teams span:last-child')?.textContent?.trim() ||
              '';

            // Try different selectors for league
            const league = 
              element.querySelector('.league-name, .competition, [class*="league"]')?.textContent?.trim() ||
              element.closest('[class*="league"]')?.querySelector('[class*="league-name"]')?.textContent?.trim() ||
              'Unknown League';

            // Try different selectors for kickoff time
            const kickoffText = 
              element.querySelector('.kickoff-time, .time, [class*="time"]')?.textContent?.trim() ||
              element.querySelector('[class*="date"]')?.textContent?.trim() ||
              '';

            // Extract match ID
            const matchId = 
              element.getAttribute('data-event-id') ||
              element.getAttribute('data-match-id') ||
              element.id ||
              '';

            if (homeTeam && awayTeam) {
              results.push({
                homeTeam,
                awayTeam,
                league,
                kickoffText,
                matchId: matchId || `${homeTeam}_${awayTeam}`,
              });
            }
          } catch (error) {
            console.error('Error parsing match element:', error);
          }
        });

        return results;
      });

      // Process scraped matches
      const now = new Date();
      scrapedMatches.forEach((m: any, index: number) => {
        const kickoff = this.parseKickoffTime(m.kickoffText);
        const id = this.generateMatchId(m.homeTeam, m.awayTeam, kickoff.toISOString());

        matches.push({
          id,
          name: `${m.homeTeam} vs ${m.awayTeam}`,
          sport,
          league: m.league,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          kickoff: kickoff.toISOString(),
        });
      });

    } catch (error) {
      console.error('Error scraping Bet9ja matches:', error);
    } finally {
      await page.close();
    }

    return matches;
  }

  async scrapeOdds(matchId: string, markets: string[] = ['1X2', 'Over/Under 2.5']): Promise<OddsData[]> {
    await this.init();
    const page = await this.browser!.newPage();
    const oddsData: OddsData[] = [];

    try {
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to specific match (you'll need to construct the URL based on match ID)
      // This is a simplified version - actual implementation needs match URL
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });

      // Extract odds for markets
      const scrapedOdds = await page.evaluate((markets) => {
        const results: any[] = [];

        // Look for market containers
        const marketElements = document.querySelectorAll(
          '.market-row, [class*="market"], .odds-container'
        );

        marketElements.forEach((marketEl) => {
          const marketName = marketEl.querySelector('.market-name, .market-title')?.textContent?.trim();
          
          if (!marketName) return;

          // Check if this is a market we want
          const isRelevantMarket = markets.some(m => 
            marketName.toLowerCase().includes(m.toLowerCase())
          );

          if (isRelevantMarket) {
            // Extract odds buttons/selections
            const oddsButtons = marketEl.querySelectorAll('.odds-button, [class*="odd"], button[class*="selection"]');
            
            oddsButtons.forEach((button) => {
              const selection = button.querySelector('.selection-name, .outcome')?.textContent?.trim();
              const oddsText = button.querySelector('.odds-value, .price')?.textContent?.trim();
              const odds = parseFloat(oddsText || '0');

              if (selection && odds > 0) {
                results.push({
                  market: marketName,
                  selection,
                  odds,
                });
              }
            });
          }
        });

        return results;
      }, markets);

      // Get match info from matchId
      const [homeTeam, awayTeam, date] = matchId.split('_vs_');
      const matchName = `${homeTeam?.replace(/_/g, ' ')} vs ${awayTeam?.replace(/_/g, ' ')}`;
      
      scrapedOdds.forEach((o: any) => {
        oddsData.push({
          matchId,
          matchName,
          sport: 'football',
          league: 'Unknown',
          kickoffTime: new Date().toISOString(),
          bookmaker: this.bookmaker,
          market: o.market,
          selection: o.selection,
          odds: o.odds,
          isSharp: false,
          scrapedAt: new Date().toISOString(),
        });
      });

    } catch (error) {
      console.error('Error scraping Bet9ja odds:', error);
    } finally {
      await page.close();
    }

    return oddsData;
  }

  private parseKickoffTime(timeText: string): Date {
    const now = new Date();
    
    // Handle "Today HH:MM" format
    if (timeText.toLowerCase().includes('today')) {
      const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        now.setHours(hours, minutes, 0, 0);
        return now;
      }
    }

    // Handle "Tomorrow HH:MM" format
    if (timeText.toLowerCase().includes('tomorrow')) {
      const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(hours, minutes, 0, 0);
        return tomorrow;
      }
    }

    // Handle "DD/MM HH:MM" or "DD/MM/YYYY HH:MM" format
    const dateMatch = timeText.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2}):(\d{2})/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1;
      const year = dateMatch[3] ? parseInt(dateMatch[3]) : now.getFullYear();
      const hours = parseInt(dateMatch[4]);
      const minutes = parseInt(dateMatch[5]);
      return new Date(year, month, day, hours, minutes, 0, 0);
    }

    // Default to 2 hours from now
    return new Date(now.getTime() + 2 * 60 * 60 * 1000);
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

// SportyBet scraper with similar structure
export class SportyBetPuppeteerScraper {
  private browser: Browser | null = null;
  private bookmaker = 'sportybet';
  private baseUrl = 'https://www.sportybet.com';

  async init(): Promise<void> {
    if (!this.browser) {
      if (isProduction) {
        this.browser = await puppeteer.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        });
      } else {
        this.browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
      }
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeMatches(sport: string = 'football'): Promise<Match[]> {
    await this.init();
    const page = await this.browser!.newPage();
    const matches: Match[] = [];

    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );
      
      await page.goto(`${this.baseUrl}/ng/sport/football`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      await page.waitForSelector('[class*="event"], [class*="match"]', {
        timeout: 10000,
      }).catch(() => {});

      // SportyBet-specific selectors (these need to be updated based on actual site structure)
      const scrapedMatches = await page.evaluate(() => {
        const elements = document.querySelectorAll('[class*="match"], [class*="event"]');
        const results: any[] = [];

        elements.forEach((el) => {
          const teams = el.querySelectorAll('[class*="team"]');
          if (teams.length >= 2) {
            results.push({
              homeTeam: teams[0].textContent?.trim() || '',
              awayTeam: teams[1].textContent?.trim() || '',
              league: el.querySelector('[class*="league"]')?.textContent?.trim() || 'Unknown',
              kickoffText: el.querySelector('[class*="time"]')?.textContent?.trim() || '',
            });
          }
        });

        return results;
      });

      scrapedMatches.forEach((m: any) => {
        const kickoff = new Date(Date.now() + 2 * 60 * 60 * 1000);
        const id = `${m.homeTeam}_vs_${m.awayTeam}_${kickoff.toISOString().split('T')[0]}`;

        matches.push({
          id,
          name: `${m.homeTeam} vs ${m.awayTeam}`,
          sport,
          league: m.league,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          kickoff: kickoff.toISOString(),
        });
      });

    } catch (error) {
      console.error('Error scraping SportyBet:', error);
    } finally {
      await page.close();
    }

    return matches;
  }

  async scrapeOdds(matchId: string, markets: string[] = ['1X2', 'Over/Under 2.5']): Promise<OddsData[]> {
    await this.init();
    const page = await this.browser!.newPage();
    const oddsData: OddsData[] = [];

    try {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });

      const scrapedOdds = await page.evaluate((markets) => {
        const results: any[] = [];
        const marketElements = document.querySelectorAll(
          '[class*="market"], [class*="outcome"], .odds-row'
        );

        marketElements.forEach((marketEl) => {
          const marketName = marketEl.querySelector('[class*="market-name"], [class*="market-title"]')?.textContent?.trim();
          
          if (!marketName) return;

          const isRelevantMarket = markets.some(m => 
            marketName.toLowerCase().includes(m.toLowerCase())
          );

          if (isRelevantMarket) {
            const oddsButtons = marketEl.querySelectorAll('[class*="odd"], [class*="selection"], button[class*="bet"]');
            
            oddsButtons.forEach((button) => {
              const selection = button.querySelector('[class*="outcome"], [class*="selection-name"]')?.textContent?.trim();
              const oddsText = button.querySelector('[class*="odd-value"], [class*="price"]')?.textContent?.trim();
              const odds = parseFloat(oddsText || '0');

              if (selection && odds > 0) {
                results.push({
                  market: marketName,
                  selection,
                  odds,
                });
              }
            });
          }
        });

        return results;
      }, markets);

      const [homeTeam, awayTeam, date] = matchId.split('_vs_');
      const matchName = `${homeTeam?.replace(/_/g, ' ')} vs ${awayTeam?.replace(/_/g, ' ')}`;
      
      scrapedOdds.forEach((o: any) => {
        oddsData.push({
          matchId,
          matchName,
          sport: 'football',
          league: 'Unknown',
          kickoffTime: new Date().toISOString(),
          bookmaker: this.bookmaker,
          market: o.market,
          selection: o.selection,
          odds: o.odds,
          isSharp: false,
          scrapedAt: new Date().toISOString(),
        });
      });

    } catch (error) {
      console.error('Error scraping SportyBet odds:', error);
    } finally {
      await page.close();
    }

    return oddsData;
  }
}

// BetKing scraper
export class BetKingPuppeteerScraper {
  private browser: Browser | null = null;
  private bookmaker = 'betking';
  private baseUrl = 'https://www.betking.com';

  async init(): Promise<void> {
    if (!this.browser) {
      if (isProduction) {
        this.browser = await puppeteer.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        });
      } else {
        this.browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
      }
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeMatches(sport: string = 'football'): Promise<Match[]> {
    await this.init();
    const page = await this.browser!.newPage();
    const matches: Match[] = [];

    try {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      
      const sportUrl = `${this.baseUrl}/sports/${sport}`;
      await page.goto(sportUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      await page.waitForSelector('[class*="event"], [class*="match"], .game-row', {
        timeout: 10000,
      }).catch(() => console.log('No events found on BetKing'));

      const scrapedMatches = await page.evaluate(() => {
        const matchElements = document.querySelectorAll(
          '[class*="event"], [class*="match-row"], [class*="game"], [data-match-id]'
        );
        
        const results: any[] = [];

        matchElements.forEach((element) => {
          try {
            const homeTeam = 
              element.querySelector('[class*="home-team"], [class*="team-home"]')?.textContent?.trim() ||
              element.querySelector('.teams > span:first-child')?.textContent?.trim() ||
              '';
            
            const awayTeam = 
              element.querySelector('[class*="away-team"], [class*="team-away"]')?.textContent?.trim() ||
              element.querySelector('.teams > span:last-child')?.textContent?.trim() ||
              '';

            const league = 
              element.querySelector('[class*="league"], [class*="competition"]')?.textContent?.trim() ||
              element.closest('[class*="league"]')?.querySelector('[class*="name"]')?.textContent?.trim() ||
              'Unknown League';

            const kickoffText = 
              element.querySelector('[class*="time"], [class*="date"]')?.textContent?.trim() ||
              '';

            const matchId = 
              element.getAttribute('data-match-id') ||
              element.getAttribute('data-event-id') ||
              element.id ||
              '';

            if (homeTeam && awayTeam) {
              results.push({
                homeTeam,
                awayTeam,
                league,
                kickoffText,
                matchId: matchId || `${homeTeam}_${awayTeam}`,
              });
            }
          } catch (error) {
            console.error('Error parsing BetKing match element:', error);
          }
        });

        return results;
      });

      scrapedMatches.forEach((m: any) => {
        const kickoff = this.parseKickoffTime(m.kickoffText);
        const id = this.generateMatchId(m.homeTeam, m.awayTeam, kickoff.toISOString());

        matches.push({
          id,
          name: `${m.homeTeam} vs ${m.awayTeam}`,
          sport,
          league: m.league,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          kickoff: kickoff.toISOString(),
        });
      });

    } catch (error) {
      console.error('Error scraping BetKing matches:', error);
    } finally {
      await page.close();
    }

    return matches;
  }

  async scrapeOdds(matchId: string, markets: string[] = ['1X2', 'Over/Under 2.5']): Promise<OddsData[]> {
    await this.init();
    const page = await this.browser!.newPage();
    const oddsData: OddsData[] = [];

    try {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });

      const scrapedOdds = await page.evaluate((markets) => {
        const results: any[] = [];
        const marketElements = document.querySelectorAll(
          '[class*="market"], [class*="betting-option"], .odds-section'
        );

        marketElements.forEach((marketEl) => {
          const marketName = marketEl.querySelector('[class*="market-name"], [class*="title"]')?.textContent?.trim();
          
          if (!marketName) return;

          const isRelevantMarket = markets.some(m => 
            marketName.toLowerCase().includes(m.toLowerCase())
          );

          if (isRelevantMarket) {
            const oddsButtons = marketEl.querySelectorAll('[class*="odd"], [class*="selection"], button[class*="outcome"]');
            
            oddsButtons.forEach((button) => {
              const selection = button.querySelector('[class*="name"], [class*="outcome"]')?.textContent?.trim();
              const oddsText = button.querySelector('[class*="value"], [class*="price"]')?.textContent?.trim();
              const odds = parseFloat(oddsText || '0');

              if (selection && odds > 0) {
                results.push({
                  market: marketName,
                  selection,
                  odds,
                });
              }
            });
          }
        });

        return results;
      }, markets);

      const [homeTeam, awayTeam, date] = matchId.split('_vs_');
      const matchName = `${homeTeam?.replace(/_/g, ' ')} vs ${awayTeam?.replace(/_/g, ' ')}`;
      
      scrapedOdds.forEach((o: any) => {
        oddsData.push({
          matchId,
          matchName,
          sport: 'football',
          league: 'Unknown',
          kickoffTime: new Date().toISOString(),
          bookmaker: this.bookmaker,
          market: o.market,
          selection: o.selection,
          odds: o.odds,
          isSharp: false,
          scrapedAt: new Date().toISOString(),
        });
      });

    } catch (error) {
      console.error('Error scraping BetKing odds:', error);
    } finally {
      await page.close();
    }

    return oddsData;
  }

  private parseKickoffTime(timeText: string): Date {
    const now = new Date();
    
    if (timeText.toLowerCase().includes('today')) {
      const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        now.setHours(hours, minutes, 0, 0);
        return now;
      }
    }

    if (timeText.toLowerCase().includes('tomorrow')) {
      const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(hours, minutes, 0, 0);
        return tomorrow;
      }
    }

    const dateMatch = timeText.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2}):(\d{2})/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1;
      const year = dateMatch[3] ? parseInt(dateMatch[3]) : now.getFullYear();
      const hours = parseInt(dateMatch[4]);
      const minutes = parseInt(dateMatch[5]);
      return new Date(year, month, day, hours, minutes, 0, 0);
    }

    return new Date(now.getTime() + 2 * 60 * 60 * 1000);
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
