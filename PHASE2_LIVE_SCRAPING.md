# Phase 2 Live Scraping - Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

### 2. Environment Variables
Add to your `.env.local`:

```env
# Odds API (for Pinnacle sharp odds)
# Get free API key from: https://the-odds-api.com/
ODDS_API_KEY=your-api-key-here

# Cron Job Security
# Generate with: openssl rand -base64 32
CRON_SECRET=your-random-secret-here
```

### 3. Vercel Configuration
The `vercel.json` file configures automated scraping every 2 minutes:

```json
{
  "crons": [{
    "path": "/api/cron/scrape-odds",
    "schedule": "*/2 * * * *"
  }]
}
```

**Note:** Vercel cron jobs only work on Pro plan. For Hobby plan, use manual triggers or external cron services (e.g., cron-job.org).

### 4. Configure Cron Secret in Vercel
```bash
# Add environment variable in Vercel dashboard
CRON_SECRET=your-random-secret-here
```

## 📋 What Was Implemented

### New Files Created

#### Scrapers
- **`src/lib/scrapers/puppeteer-scrapers.ts`** - Real browser automation for Bet9ja, SportyBet, BetKing
- **`src/lib/scrapers/sharp-odds-api.ts`** - Pinnacle API integration via OddsAPI.io
- **`src/lib/scrapers/scraping-service.ts`** - Orchestration service + scheduler

#### API Routes
- **`src/app/api/cron/scrape-odds/route.ts`** - Automated cron endpoint
- **`src/app/api/scrape/route.ts`** - Manual scraping trigger (admin only)

#### Admin Components
- **`src/components/admin/scraping-control.tsx`** - Admin UI for manual scraping

#### Configuration
- **`vercel.json`** - Cron job configuration

## 🎯 How It Works

### Architecture Flow

```
┌─────────────────────────────────────────────────────────┐
│                 Vercel Cron Job (Every 2min)            │
│                  /api/cron/scrape-odds                  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
           ┌─────────────────────────────┐
           │   OddsScrapingService       │
           └─────────────┬───────────────┘
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
┌───────────────┐ ┌─────────────┐ ┌──────────────┐
│  Sharp Odds   │ │  Bet9ja     │ │  SportyBet   │
│  (Pinnacle)   │ │  Puppeteer  │ │  Puppeteer   │
└───────┬───────┘ └──────┬──────┘ └──────┬───────┘
        │                │                │
        └────────────────┼────────────────┘
                         ↓
              ┌──────────────────────┐
              │  Store in Database   │
              │  (odds_snapshots)    │
              └──────────┬───────────┘
                         ↓
              ┌──────────────────────┐
              │  Detect Value Bets   │
              │  (detect_value_     │
              │   opportunities)     │
              └──────────┬───────────┘
                         ↓
              ┌──────────────────────┐
              │  Update Opportunities│
              │  Dashboard           │
              └──────────────────────┘
```

### Scraping Process

1. **Sharp Odds Fetching**
   - Calls OddsAPI.io to get Pinnacle odds
   - These represent the "true" market probability
   - Stored with `is_sharp = true`

2. **Soft Bookmaker Scraping**
   - Puppeteer launches headless Chrome
   - Navigates to Bet9ja/SportyBet/BetKing
   - Extracts matches and odds using CSS selectors
   - Stored with `is_sharp = false`

3. **Value Detection**
   - Compares sharp vs soft odds for same events
   - Calculates edge: `((true_prob - implied_prob) / implied_prob) * 100`
   - Filters opportunities with min 2% edge
   - Calculates Kelly fraction for stake sizing

4. **Data Storage**
   - All odds saved to `odds_snapshots` table
   - Opportunities saved to `value_opportunities` table
   - Old odds (>1 hour) automatically cleaned up

## 🔧 Configuration Options

### Scraping Frequency
Edit `vercel.json` to change schedule:

```json
{
  "crons": [{
    "path": "/api/cron/scrape-odds",
    "schedule": "*/5 * * * *"  // Every 5 minutes
  }]
}
```

Cron syntax: `minute hour day month weekday`
- `*/2 * * * *` = Every 2 minutes
- `0 */1 * * *` = Every hour
- `*/30 * * * *` = Every 30 minutes

### Minimum Edge
Edit in `src/lib/scrapers/scraping-service.ts`:

```typescript
const { data, error } = await supabase.rpc('detect_value_opportunities', {
  p_min_edge: 2.0, // Change this value (default: 2%)
  p_sport: 'football',
});
```

### Markets Scraped
Edit in `src/lib/scrapers/scraping-service.ts`:

```typescript
const markets = ['1X2', 'Over/Under 2.5', 'Both Teams to Score'];
// Add more: 'Double Chance', 'Handicap', etc.
```

## 🧪 Testing

### Manual Testing
1. Add the scraping control to admin dashboard
2. Navigate to `/admin` 
3. Click "Trigger Scraping" button
4. Monitor console for progress

### API Testing
```bash
# Test cron endpoint (with secret)
curl -X GET https://your-app.vercel.app/api/cron/scrape-odds \
  -H "Authorization: Bearer your-cron-secret"

# Test manual scraping (requires admin auth)
curl -X POST https://your-app.vercel.app/api/scrape \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-supabase-token" \
  -d '{"sport": "football"}'

# Check status
curl https://your-app.vercel.app/api/scrape
```

### Database Verification
```sql
-- Check latest scraped odds
SELECT * FROM odds_snapshots 
ORDER BY scraped_at DESC 
LIMIT 10;

-- Check active opportunities
SELECT * FROM value_opportunities 
WHERE status = 'active' 
ORDER BY edge_percent DESC;

-- Check scraping frequency
SELECT 
  bookmaker,
  COUNT(*) as total_odds,
  MAX(scraped_at) as last_scrape
FROM odds_snapshots
WHERE scraped_at > NOW() - INTERVAL '1 hour'
GROUP BY bookmaker;
```

## ⚠️ Important Notes

### Puppeteer on Vercel
Puppeteer has limitations on Vercel:
- **Serverless Functions**: Limited to 50MB, Chromium is ~300MB
- **Solution**: Use `@sparticuz/chromium` package for serverless

Install Chromium for serverless:
```bash
npm install @sparticuz/chromium
```

Update scraper to use serverless Chromium:
```typescript
import chromium from '@sparticuz/chromium';

const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
});
```

### Rate Limiting
- Bookmakers may block frequent requests
- Use delays between requests: `await new Promise(r => setTimeout(r, 2000))`
- Rotate user agents
- Consider using proxies for production

### API Costs
- **OddsAPI.io**: Free tier = 500 requests/month
- Each scrape uses 1 request
- 2-min interval = ~21,600 requests/month
- **Recommendation**: Use 5-10 min intervals or upgrade to paid plan

### Bookmaker Selectors
The CSS selectors in `puppeteer-scrapers.ts` are **approximate** and need to be updated based on actual bookmaker websites:

```typescript
// These selectors MUST be verified and updated:
const matchElements = document.querySelectorAll(
  '.event-item, [class*="event-row"], .match-row'
);
```

**Action Required**: Inspect bookmaker websites and update selectors.

## 🛠️ Troubleshooting

### Scraping Returns 0 Odds
1. Check if selectors are correct
2. Verify bookmaker website hasn't changed structure
3. Check browser console logs
4. Try with headless: false for debugging

### Chromium Not Found
```bash
npm install @sparticuz/chromium
```

### Cron Job Not Running
1. Verify Vercel Pro plan (required for crons)
2. Check `vercel.json` is in project root
3. Verify CRON_SECRET is set in Vercel dashboard
4. Check Vercel deployment logs

### No Sharp Odds
1. Verify ODDS_API_KEY is set
2. Check API quota: https://the-odds-api.com/account
3. Try Cloudbet as backup (no API key required)

## 📊 Monitoring

### Admin Dashboard
Add to `src/app/admin/page.tsx`:

```tsx
import { ScrapingControl } from '@/components/admin/scraping-control';

export default function AdminPage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <ScrapingControl />
    </div>
  );
}
```

### Logs
```bash
# Vercel deployment logs
vercel logs --follow

# Filter for scraping logs
vercel logs --follow | grep "ScrapingService"
```

## 🚀 Next Steps

1. **Update Bookmaker Selectors**
   - Inspect Bet9ja/SportyBet/BetKing websites
   - Update CSS selectors in `puppeteer-scrapers.ts`

2. **Get OddsAPI Key**
   - Sign up at https://the-odds-api.com/
   - Add key to `.env.local` and Vercel

3. **Test Locally**
   - Run `npm run dev`
   - Trigger manual scraping via admin UI
   - Verify odds appear in database

4. **Deploy to Vercel**
   - Push to GitHub
   - Vercel auto-deploys
   - Set CRON_SECRET in dashboard
   - Enable cron job

5. **Monitor Performance**
   - Check scraping frequency
   - Monitor API quota usage
   - Verify opportunity detection

## 📝 Implementation Checklist

- [x] Install Puppeteer packages
- [x] Create Puppeteer scrapers for Nigerian bookmakers
- [x] Implement Pinnacle API integration
- [x] Build scraping orchestration service
- [x] Create cron job API route
- [x] Add manual trigger endpoint
- [x] Create admin UI component
- [x] Configure Vercel cron job
- [ ] Update bookmaker CSS selectors (REQUIRES MANUAL INSPECTION)
- [ ] Get OddsAPI key
- [ ] Test local scraping
- [ ] Deploy to Vercel
- [ ] Configure environment variables
- [ ] Monitor first automated run

## 🎓 Resources

- [Puppeteer Docs](https://pptr.dev/)
- [The Odds API](https://the-odds-api.com/liveapi/guides/v4/)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Chromium for Serverless](https://github.com/Sparticuz/chromium)
