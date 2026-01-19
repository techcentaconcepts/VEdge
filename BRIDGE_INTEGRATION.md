# Bridge Integration Guide

## Overview

The Vantedge platform now uses a **FastAPI bridge service** for scraping Nigerian bookmakers instead of direct Puppeteer scrapers. This provides:

- ✅ Better Cloudflare bypass (BetKing works!)
- ✅ Maintained selectors via NaijaBet-Api library
- ✅ Serverless-friendly architecture
- ✅ Easier debugging and monitoring

## Architecture

```
Vercel (Next.js)
    ↓
    API Route: /api/bridge/odds/[bookmaker]/[league]
    ↓
    Railway (FastAPI Bridge)
    ↓
    NaijaBet-Api Library
    ↓
    Nigerian Bookmakers (Bet9ja, BetKing, SportyBet)
```

## API Routes

### 1. Fetch Odds from Specific Bookmaker

**Endpoint:** `GET /api/bridge/odds/[bookmaker]/[league]`

**Bookmakers:** `bet9ja`, `betking`, `sportybet`, `all`

**Leagues:** `premierleague`, `laliga`, `seriea`, `bundesliga`, `ligue1`, `npfl`, `ucl`, `europa`

**Example:**
```bash
curl http://localhost:3000/api/bridge/odds/bet9ja/premierleague
```

**Response:**
```json
{
  "bookmaker": "bet9ja",
  "league": "premierleague",
  "matches": [
    {
      "id": "match_1",
      "home_team": "Arsenal",
      "away_team": "Chelsea",
      "kickoff": "2026-01-20T15:00:00",
      "odds": {
        "home": 2.10,
        "draw": 3.40,
        "away": 3.60
      }
    }
  ],
  "timestamp": "2026-01-19T10:30:00",
  "count": 15
}
```

### 2. Fetch from All Bookmakers

**Endpoint:** `GET /api/bridge/odds/all/[league]`

**Example:**
```bash
curl http://localhost:3000/api/bridge/odds/all/premierleague
```

### 3. Health Check

**Endpoint:** `GET /api/bridge/health`

Checks if the bridge service is reachable.

## TypeScript Client

Use the `BridgeClient` class for type-safe API calls:

```typescript
import { bridgeClient, getBet9jaOdds } from '@/lib/scrapers/bridge-client';

// Fetch Bet9ja odds
const data = await getBet9jaOdds('premierleague');
console.log(`Found ${data.count} matches`);

// Health check
const health = await bridgeClient.healthCheck();
console.log(`Bridge status: ${health.status}`);
```

## Environment Variables

### Local Development (.env.local)

```env
NAIJA_BRIDGE_URL=http://localhost:8000
```

### Production (Vercel)

```env
NAIJA_BRIDGE_URL=https://your-railway-app.railway.app
```

## Deployment Checklist

### 1. Deploy Bridge Service to Railway

```bash
cd bridge
railway init
railway up
```

Get your Railway URL: `https://your-app.railway.app`

### 2. Update Vercel Environment Variables

In Vercel dashboard:
1. Go to Settings → Environment Variables
2. Add `NAIJA_BRIDGE_URL` = `https://your-app.railway.app`
3. Redeploy

### 3. Test the Integration

```bash
# Test bridge health
curl https://your-vercel-app.vercel.app/api/bridge/health

# Test odds fetching
curl https://your-vercel-app.vercel.app/api/bridge/odds/bet9ja/premierleague
```

## Migrating from Puppeteer Scrapers

### Old Code (Direct Puppeteer)
```typescript
import { Bet9jaPuppeteerScraper } from '@/lib/scrapers/puppeteer-scrapers';

const scraper = new Bet9jaPuppeteerScraper();
const data = await scraper.scrape();
```

### New Code (Bridge Client)
```typescript
import { getBet9jaOdds } from '@/lib/scrapers/bridge-client';

const data = await getBet9jaOdds('premierleague');
```

## Update Scraping Service

Replace direct scraper calls in [scraping-service.ts](src/lib/scrapers/scraping-service.ts):

```typescript
import { getAllBookmakersOdds } from './bridge-client';

// Old: Direct Puppeteer
// const bet9jaData = await bet9jaScraper.scrape();

// New: Bridge API
const bridgeData = await getAllBookmakersOdds('premierleague');
const bet9jaData = bridgeData.bookmakers.bet9ja;
```

## Monitoring & Debugging

### Check Bridge Health
```bash
curl https://your-railway-app.railway.app/health
```

### View Railway Logs
```bash
railway logs
```

### Test Individual Bookmaker
```bash
# Test Bet9ja
curl https://your-railway-app.railway.app/api/odds/bet9ja/premierleague

# Test BetKing (Cloudflare bypass)
curl https://your-railway-app.railway.app/api/odds/betking/premierleague
```

## Error Handling

### Bridge Unreachable (503)
```json
{
  "error": "Bridge request timeout",
  "bridge_url": "https://your-app.railway.app",
  "hint": "Make sure the bridge service is running"
}
```

**Solution:** Check Railway deployment status

### Invalid League (400)
```json
{
  "error": "Invalid league",
  "valid_leagues": ["premierleague", "laliga", ...]
}
```

**Solution:** Use a valid league identifier

### NaijaBet-Api Error (500)
```json
{
  "error": "Bet9ja scraping failed: ...",
  "status": 500
}
```

**Solution:** Check Railway logs for scraper errors

## Performance

- **First Request (Cold Start):** 10-30 seconds
- **Subsequent Requests:** 2-5 seconds
- **Timeout:** 60 seconds (configurable)

## Cost

- **Railway:** ~$5/month (free tier covers most usage)
- **Vercel:** Free tier sufficient for API routes

## Next Steps

1. ✅ Deploy bridge to Railway
2. ✅ Test all bookmakers work
3. ✅ Update Vercel environment
4. ✅ Migrate scraping-service.ts to use bridge
5. ✅ Update admin panel to show bridge status
6. ✅ Set up monitoring/alerts
