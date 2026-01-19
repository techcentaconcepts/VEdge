# Vantedge Phase 2: Odds Scraping & Value Detection

## ✅ What's Been Built

### 1. Database Infrastructure
- ✅ **odds_snapshots table** - Stores historical odds from all bookmakers
- ✅ **value_opportunities table** - Detected +EV betting opportunities
- ✅ **Database Functions:**
  - `store_odds_snapshot()` - Save scraped odds
  - `get_latest_odds()` - Retrieve current odds for a match
  - `detect_value_opportunities()` - Auto-detect value bets
  - `update_opportunity_status()` - Mark opportunities as expired/won/lost
  - `cleanup_old_odds_snapshots()` - Remove odds older than 7 days

### 2. Odds Scraping Framework
- ✅ [src/lib/scrapers/odds-scraper.ts](src/lib/scrapers/odds-scraper.ts) - Modular scraper framework
  - `BookmakerScraper` base class
  - `Bet9jaScraper`, `SportyBetScraper`, `BetKingScraper` implementations
  - `OddsComparisonService` - Compares odds across bookmakers
  - Value calculation logic (edge %, Kelly Criterion)

### 3. API Endpoints
- ✅ `GET /api/opportunities` - Fetch value bets
  - Tier-based filtering (free/starter/pro)
  - Query params: `min_edge`, `sport`, `bookmaker`, `limit`
  - Free tier: Top 3, 5-minute delay, hidden sharp odds
  - Starter tier: All bets, 2-minute delay
  - Pro tier: Real-time, unlimited

### 4. Dashboard UI
- ✅ [src/app/opportunities/page.tsx](src/app/opportunities/page.tsx) - Opportunities page
- ✅ [src/components/opportunities/opportunities-list.tsx](src/components/opportunities/opportunities-list.tsx)
  - Live opportunities feed
  - Filters: Min edge, Sport selection
  - Auto-refresh for pro users (30s)
  - Tier upgrade prompts
  - Color-coded edge badges (high/medium/low)
  - Kelly stake recommendations

### 5. Sample Data
- ✅ [supabase/migrations/004_seed_opportunities.sql](supabase/migrations/004_seed_opportunities.sql)
  - 7 sample value opportunities
  - Premier League, La Liga, NBA matches
  - Edge percentages from 11% to 17%

---

## 🎯 How It Works

### Value Detection Algorithm

```
1. Scrape sharp bookmakers (Pinnacle, Betfair) → True market probability
2. Scrape soft bookmakers (Bet9ja, SportyBet, BetKing) → Implied probability
3. Compare for same match/market/selection
4. If Soft Odds > Sharp Odds: POTENTIAL VALUE
5. Calculate Edge % = ((True Prob - Implied Prob) / Implied Prob) × 100
6. If Edge ≥ Minimum Threshold → CREATE OPPORTUNITY
7. Calculate Kelly Fraction = (Edge × Probability / Odds) × 0.25
```

**Example:**
```
Match: Arsenal vs Chelsea
Market: 1X2 - Arsenal
Sharp (Pinnacle): 1.85 → True Probability = 54.05%
Soft (Bet9ja): 2.10 → Implied Probability = 47.62%
Edge = (54.05% - 47.62%) / 47.62% = 13.5%
Kelly = (0.135 × 0.5405 / 2.10) × 0.25 = 3.38% of bankroll
```

---

## 🚀 Testing Phase 2

### 1. Apply Database Migrations

```bash
# Option A: Using script
chmod +x setup-phase2.sh
./setup-phase2.sh

# Option B: Manual
cd supabase
supabase db push
```

### 2. Access Opportunities Dashboard

```
http://localhost:3000/opportunities
```

You should see 7 sample opportunities with edges from 11% to 17%.

### 3. Test Tier Filtering

The API automatically filters based on user's subscription tier:

**Free Tier:**
- Only top 3 opportunities
- 5-minute delay
- Sharp bookmaker hidden (shows "🔒 Upgrade to see")
- No Kelly recommendations

**Starter Tier:**
- All opportunities
- 2-minute delay
- Shows sharp bookmaker and odds
- Kelly recommendations included

**Pro Tier:**
- Real-time (no delay)
- Unlimited opportunities
- Auto-refresh every 30s
- Full details

To test different tiers, update your profile in the database:
```sql
UPDATE profiles 
SET subscription_tier = 'pro' -- or 'starter' or 'free'
WHERE id = 'your-user-id';
```

---

## 🛠️ Next Steps: Implementing Live Scraping

The framework is ready, but scrapers need real implementation with Puppeteer/Playwright.

### 1. Install Scraping Dependencies

```bash
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

### 2. Implement Bet9ja Scraper

Update [src/lib/scrapers/odds-scraper.ts](src/lib/scrapers/odds-scraper.ts):

```typescript
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export class Bet9jaScraper extends BookmakerScraper {
  async scrapeMatches(sport: string = 'football'): Promise<Match[]> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto('https://web.bet9ja.com/Sport/Football');
    
    // Wait for matches to load
    await page.waitForSelector('.event-row');
    
    const matches = await page.$$eval('.event-row', (rows) => {
      return rows.map(row => ({
        id: row.getAttribute('data-match-id'),
        homeTeam: row.querySelector('.team-home')?.textContent,
        awayTeam: row.querySelector('.team-away')?.textContent,
        kickoff: row.querySelector('.kickoff-time')?.textContent,
        // ... more extraction logic
      }));
    });
    
    await browser.close();
    return matches;
  }
}
```

### 3. Create Scraping Cron Job

Create `src/lib/cron/scrape-odds.ts`:

```typescript
import { Bet9jaScraper, SportyBetScraper, OddsComparisonService } from '@/lib/scrapers/odds-scraper';
import { createClient } from '@supabase/supabase-js';

export async function scrapeAndDetectValue() {
  const scrapers = [
    new Bet9jaScraper(),
    new SportyBetScraper(),
    // Add Pinnacle scraper for sharp odds
  ];
  
  const service = new OddsComparisonService(scrapers);
  
  // 1. Scrape all bookmakers
  const oddsMap = await service.compareOdds('football');
  
  // 2. Store odds in database
  const supabase = createClient(/* ... */);
  for (const [matchId, odds] of oddsMap) {
    for (const odd of odds) {
      await supabase.rpc('store_odds_snapshot', {
        p_match_id: odd.matchId,
        p_match_name: odd.matchName,
        // ... more params
      });
    }
  }
  
  // 3. Detect value opportunities
  const { data: opportunities } = await supabase.rpc('detect_value_opportunities', {
    p_min_edge: 3.0,
    p_sport: 'football'
  });
  
  // 4. Insert new opportunities
  for (const opp of opportunities) {
    await supabase.from('value_opportunities').insert(opp);
  }
  
  console.log(`Detected ${opportunities.length} value opportunities`);
}
```

### 4. Schedule with Vercel Cron (Production)

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/scrape-odds",
    "schedule": "*/2 * * * *"
  }]
}
```

Create `src/app/api/cron/scrape-odds/route.ts`:

```typescript
import { scrapeAndDetectValue } from '@/lib/cron/scrape-odds';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  await scrapeAndDetectValue();
  return NextResponse.json({ success: true });
}
```

---

## 📊 Features Overview

| Feature | Free Tier | Starter Tier | Pro Tier |
|---------|-----------|--------------|----------|
| **Opportunities** | Top 3 | All | All |
| **Delay** | 5 minutes | 2 minutes | Real-time |
| **Sharp Odds** | Hidden | Visible | Visible |
| **Kelly Recommendations** | ❌ | ✅ | ✅ |
| **Auto-refresh** | ❌ | ❌ | ✅ (30s) |
| **Telegram Alerts** | ❌ | ❌ | ✅ |

---

## 🎨 UI Features

- **Color-coded edge badges:**
  - 🟢 High (≥10%): Green
  - 🟡 Medium (5-9.9%): Yellow
  - 🔵 Low (3-4.9%): Blue

- **Smart filtering:**
  - Min edge threshold (2%, 3%, 5%, 10%+)
  - Sport selection (All, Football, Basketball, Tennis)

- **Tier prompts:**
  - Free users see upgrade banner
  - Sharp odds locked behind paywall
  - Clear value proposition

---

## 🔐 Security Considerations

When implementing real scrapers:

1. **Rate Limiting:** Don't scrape too frequently
2. **Proxies:** Use residential proxies (Techcenta)
3. **User Agents:** Rotate realistic user agents
4. **Stealth:** Use puppeteer-stealth plugin
5. **Error Handling:** Graceful failures, retry logic
6. **IP Rotation:** Prevent IP bans

---

## 📈 Performance Optimization

- Odds snapshots partitioned by month (consider TimescaleDB)
- Auto-cleanup of odds older than 7 days
- Indexed queries on `scraped_at`, `match_id`, `is_sharp`
- Cached opportunities for free/starter tiers
- Real-time WebSocket for pro tier (Phase 3)

---

## ✅ Testing Checklist

- [x] Database migrations applied
- [x] Sample opportunities seeded
- [x] `/opportunities` page loads
- [x] Edge badges display correctly
- [x] Filters work (min edge, sport)
- [x] Tier filtering works (free/starter/pro)
- [x] Upgrade prompts show for free tier
- [x] API endpoint returns correct data
- [ ] Implement real Bet9ja scraper
- [ ] Add Pinnacle/sharp bookmaker scraper
- [ ] Create cron job for scraping
- [ ] Test value detection algorithm
- [ ] Add Telegram notifications (Phase 3)

---

## 📚 Related Files

- **Database:** [supabase/migrations/003_odds_functions.sql](supabase/migrations/003_odds_functions.sql)
- **Scraper Framework:** [src/lib/scrapers/odds-scraper.ts](src/lib/scrapers/odds-scraper.ts)
- **API Route:** [src/app/api/opportunities/route.ts](src/app/api/opportunities/route.ts)
- **UI Component:** [src/components/opportunities/opportunities-list.tsx](src/components/opportunities/opportunities-list.tsx)
- **Page:** [src/app/opportunities/page.tsx](src/app/opportunities/page.tsx)
- **Sample Data:** [supabase/migrations/004_seed_opportunities.sql](supabase/migrations/004_seed_opportunities.sql)

---

**Status:** Phase 2 Infrastructure Complete ✅  
**Next:** Implement live scraping + Telegram alerts (Phase 3)
