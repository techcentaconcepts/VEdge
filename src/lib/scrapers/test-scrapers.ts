/**
 * Test script for Puppeteer scrapers
 * Run with: npx ts-node src/lib/scrapers/test-scrapers.ts
 * Or add to package.json: "test:scrapers": "ts-node src/lib/scrapers/test-scrapers.ts"
 */

import { Bet9jaPuppeteerScraper, SportyBetPuppeteerScraper, BetKingPuppeteerScraper } from './puppeteer-scrapers';

async function testBet9ja() {
  console.log('\n🟢 Testing Bet9ja Scraper...');
  console.log('━'.repeat(60));
  
  const scraper = new Bet9jaPuppeteerScraper();
  
  try {
    // Test match scraping
    console.log('Scraping matches from Bet9ja...');
    const matches = await scraper.scrapeMatches('football');
    console.log(`✓ Found ${matches.length} matches`);
    
    if (matches.length > 0) {
      console.log('\nSample matches:');
      matches.slice(0, 3).forEach((match, i) => {
        console.log(`  ${i + 1}. ${match.name}`);
        console.log(`     League: ${match.league}`);
        console.log(`     Kickoff: ${new Date(match.kickoff).toLocaleString()}`);
        console.log(`     ID: ${match.id}`);
      });

      // Test odds scraping for first match
      if (matches[0]) {
        console.log(`\nScraping odds for: ${matches[0].name}...`);
        const odds = await scraper.scrapeOdds(matches[0].id);
        console.log(`✓ Found ${odds.length} odds`);
        
        if (odds.length > 0) {
          console.log('\nSample odds:');
          odds.slice(0, 5).forEach((odd, i) => {
            console.log(`  ${i + 1}. ${odd.market} - ${odd.selection}: ${odd.odds}`);
          });
        }
      }
    } else {
      console.log('⚠️  No matches found - check if selectors need updating');
    }
  } catch (error) {
    console.error('❌ Error testing Bet9ja:', error);
  } finally {
    await scraper.close();
    console.log('\n✓ Browser closed');
  }
}

async function testSportyBet() {
  console.log('\n🔵 Testing SportyBet Scraper...');
  console.log('━'.repeat(60));
  
  const scraper = new SportyBetPuppeteerScraper();
  
  try {
    console.log('Scraping matches from SportyBet...');
    const matches = await scraper.scrapeMatches('football');
    console.log(`✓ Found ${matches.length} matches`);
    
    if (matches.length > 0) {
      console.log('\nSample matches:');
      matches.slice(0, 3).forEach((match, i) => {
        console.log(`  ${i + 1}. ${match.name}`);
        console.log(`     League: ${match.league}`);
      });

      if (matches[0]) {
        console.log(`\nScraping odds for: ${matches[0].name}...`);
        const odds = await scraper.scrapeOdds(matches[0].id);
        console.log(`✓ Found ${odds.length} odds`);
        
        if (odds.length > 0) {
          console.log('\nSample odds:');
          odds.slice(0, 5).forEach((odd, i) => {
            console.log(`  ${i + 1}. ${odd.market} - ${odd.selection}: ${odd.odds}`);
          });
        }
      }
    } else {
      console.log('⚠️  No matches found - check if selectors need updating');
    }
  } catch (error) {
    console.error('❌ Error testing SportyBet:', error);
  } finally {
    await scraper.close();
    console.log('\n✓ Browser closed');
  }
}

async function testBetKing() {
  console.log('\n🟠 Testing BetKing Scraper...');
  console.log('━'.repeat(60));
  
  const scraper = new BetKingPuppeteerScraper();
  
  try {
    console.log('Scraping matches from BetKing...');
    const matches = await scraper.scrapeMatches('football');
    console.log(`✓ Found ${matches.length} matches`);
    
    if (matches.length > 0) {
      console.log('\nSample matches:');
      matches.slice(0, 3).forEach((match, i) => {
        console.log(`  ${i + 1}. ${match.name}`);
        console.log(`     League: ${match.league}`);
      });

      if (matches[0]) {
        console.log(`\nScraping odds for: ${matches[0].name}...`);
        const odds = await scraper.scrapeOdds(matches[0].id);
        console.log(`✓ Found ${odds.length} odds`);
        
        if (odds.length > 0) {
          console.log('\nSample odds:');
          odds.slice(0, 5).forEach((odd, i) => {
            console.log(`  ${i + 1}. ${odd.market} - ${odd.selection}: ${odd.odds}`);
          });
        }
      }
    } else {
      console.log('⚠️  No matches found - check if selectors need updating');
    }
  } catch (error) {
    console.error('❌ Error testing BetKing:', error);
  } finally {
    await scraper.close();
    console.log('\n✓ Browser closed');
  }
}

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        Puppeteer Scraper Test Suite                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const startTime = Date.now();

  // Test one at a time to avoid resource issues
  await testBet9ja();
  await testSportyBet();
  await testBetKing();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log(`║  All tests completed in ${duration}s                          ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

// Run tests
runAllTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
