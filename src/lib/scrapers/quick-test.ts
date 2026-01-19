/**
 * Quick test for Bet9ja and SportyBet only (BetKing blocks with Cloudflare)
 * Run with: npm run test:quick
 */

import { Bet9jaPuppeteerScraper, SportyBetPuppeteerScraper } from './puppeteer-scrapers';

async function quickTest() {
  console.log('\n🧪 Quick Scraper Test (Bet9ja + SportyBet)\n');

  // Test Bet9ja
  console.log('🟢 Testing Bet9ja...');
  const bet9ja = new Bet9jaPuppeteerScraper();
  try {
    const matches = await Promise.race([
      bet9ja.scrapeMatches('football'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000))
    ]) as any[];
    console.log(`   ✅ Found ${matches.length} matches`);
    if (matches.length > 0) {
      console.log(`   Sample: ${matches[0].name}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  } finally {
    await bet9ja.close();
  }

  // Test SportyBet
  console.log('\n🔵 Testing SportyBet...');
  const sportybet = new SportyBetPuppeteerScraper();
  try {
    const matches = await Promise.race([
      sportybet.scrapeMatches('football'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000))
    ]) as any[];
    console.log(`   ✅ Found ${matches.length} matches`);
    if (matches.length > 0) {
      console.log(`   Sample: ${matches[0].name}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  } finally {
    await sportybet.close();
  }

  console.log('\n✨ Test complete\n');
  process.exit(0);
}

quickTest().catch(console.error);
