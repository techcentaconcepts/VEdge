# Nigerian Bookmaker Scraping Strategy
**Updated:** January 19, 2026

## Current Status

### Test Results from `npm run test:quick`
- ✅ **Bet9ja**: Connected successfully but found 0 matches (selector issue)
- ❌ **SportyBet**: Timeout/crash (needs investigation)
- ❌ **BetKing**: 403 Forbidden (Cloudflare blocking)

### Root Causes
1. **Outdated URLs** - Sites may have migrated to modern SPAs
2. **Generic Selectors** - Don't match actual DOM structure
3. **Anti-Bot Protection** - BetKing uses aggressive Cloudflare

---

## Recommended Approach: Hybrid Strategy

### Phase 1: Quick Win (Week 1)
**Use NaijaBet-Api for all Nigerian bookies**

```bash
# Install the library
pip install NaijaBet-Api playwright

# Benefits:
- ✅ Handles Cloudflare automatically
- ✅ Maintained selectors
- ✅ Built-in error handling
- ✅ Supports Bet9ja, BetKing, Nairabet
```

**Architecture:**
```
┌─────────────┐
│  Vercel     │
│  Frontend   │
└──────┬──────┘
       │
       │ HTTPS
       ▼
┌─────────────┐     ┌──────────────┐
│  Railway    │────▶│  Bet9ja      │
│  FastAPI    │     │  BetKing     │
│  Bridge     │     │  SportyBet   │
└─────────────┘     └──────────────┘
   Uses NaijaBet-Api
```

**Cost:** ~$5/month (Railway free tier + small dyno)

### Phase 2: Optimization (Week 2-3)
**Add direct scraping for lightweight bookies**

For sites with simpler protection:
1. Inspect actual site structure
2. Write custom Puppeteer scrapers
3. Fallback to NaijaBet-Api if blocked

---

## Implementation Code

### 1. FastAPI Bridge Service

```python
# bridge/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from NaijaBet_Api.bookmakers import Bet9ja, BetkingPlaywright, SportybetPlaywright
from NaijaBet_Api.id import Betid
import asyncio

app = FastAPI(title="Vantedge Naija Bridge")

# Allow Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://vantedge.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "naija-bridge"}

@app.get("/api/odds/bet9ja/{league}")
async def get_bet9ja_odds(league: str):
    """Fetch Bet9ja odds using NaijaBet-Api"""
    try:
        scraper = Bet9ja()
        league_id = getattr(Betid, league.upper(), Betid.PREMIERLEAGUE)
        data = scraper.get_league(league_id)
        
        return {
            "bookmaker": "bet9ja",
            "league": league,
            "matches": data,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/odds/betking/{league}")
async def get_betking_odds(league: str):
    """Fetch BetKing odds (handles Cloudflare)"""
    try:
        with BetkingPlaywright() as scraper:
            league_id = getattr(Betid, league.upper(), Betid.PREMIERLEAGUE)
            data = scraper.get_league(league_id)
            
        return {
            "bookmaker": "betking",
            "league": league,
            "matches": data,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/odds/sportybet/{league}")
async def get_sportybet_odds(league: str):
    """Fetch SportyBet odds"""
    try:
        with SportybetPlaywright() as scraper:
            league_id = getattr(Betid, league.upper(), Betid.PREMIERLEAGUE)
            data = scraper.get_league(league_id)
            
        return {
            "bookmaker": "sportybet",
            "league": league,
            "matches": data,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### 2. Update Your Vercel API to Call Bridge

```typescript
// src/app/api/scrape/nigerian/route.ts
export async function GET(request: Request) {
  const BRIDGE_URL = process.env.NAIJA_BRIDGE_URL || 'https://naija-bridge.up.railway.app';
  
  try {
    const [bet9jaRes, betkingRes, sportybetRes] = await Promise.all([
      fetch(`${BRIDGE_URL}/api/odds/bet9ja/premierleague`),
      fetch(`${BRIDGE_URL}/api/odds/betking/premierleague`),
      fetch(`${BRIDGE_URL}/api/odds/sportybet/premierleague`)
    ]);

    const data = {
      bet9ja: await bet9jaRes.json(),
      betking: await betkingRes.json(),
      sportybet: await sportybetRes.json()
    };

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### 3. Environment Setup

```bash
# .env.local (Vercel)
NAIJA_BRIDGE_URL=https://naija-bridge.up.railway.app

# Railway environment variables
ALLOWED_ORIGINS=https://vantedge.vercel.app,http://localhost:3000
```

---

## Deployment Steps

### 1. Deploy FastAPI Bridge to Railway

```bash
# Create railway.json in bridge/ directory
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health"
  }
}

# requirements.txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
NaijaBet-Api==1.0.0
playwright==1.41.0
python-dotenv==1.0.0
```

### 2. Install Playwright browsers (Railway)

Add to your start command:
```bash
playwright install && uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 3. Test Locally First

```bash
cd bridge
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install
uvicorn main:app --reload

# Test endpoint
curl http://localhost:8000/api/odds/bet9ja/premierleague
```

---

## Alternative: Modern URL Research

If you prefer to keep Puppeteer direct (no Python bridge):

### Step 1: Find Current URLs

```bash
# Open in browser and inspect
https://www.bet9ja.com
https://www.sportybet.com/ng
https://www.betking.com
```

### Step 2: Update Scraper URLs

```typescript
// For Bet9ja (if they migrated to SPA)
const baseUrl = 'https://www.bet9ja.com';
const sportUrl = `${baseUrl}/sport`;

// Wait for dynamic content
await page.waitForSelector('[data-testid="match-card"]', { timeout: 10000 });
```

### Step 3: Inspect Real Selectors

Use Chrome DevTools → Elements → Copy Selector
```typescript
// Example real selectors (verify these!)
const matchSelector = 'div[class*="EventRow"]';
const oddsSelector = 'button[class*="OddsButton"]';
const teamSelector = 'span[class*="TeamName"]';
```

---

## Recommendation

**Use Option 1 (NaijaBet-Api) because:**

1. ✅ **Saves 2-3 weeks** of selector maintenance
2. ✅ **Handles Cloudflare** out of the box
3. ✅ **$5/month** is negligible vs development time
4. ✅ **Community maintained** - others fix selectors when sites change
5. ✅ **Focus on your core value** - the value detection algorithm, not scraping

**Timeline:**
- Day 1: Deploy FastAPI bridge to Railway
- Day 2: Update Vercel frontend to call bridge
- Day 3: Test with real odds data
- Day 4: Build value detection logic
- Week 2: Focus on UX and monetization

---

## Next Steps

1. **Immediate:** Deploy the FastAPI bridge code above
2. **This week:** Get real Nigerian odds flowing
3. **Next week:** Build the value comparison logic
4. **Week 3:** Launch beta with Telegram alerts

Would you like me to:
1. Generate the complete Railway deployment config?
2. Create a test script to verify the NaijaBet-Api locally?
3. Update your existing Puppeteer scrapers to call the bridge instead?
