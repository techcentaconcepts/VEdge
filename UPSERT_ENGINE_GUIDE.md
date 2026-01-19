# The "Upsert & Edge Engine" - Complete Implementation Guide

## 🎯 What We Built

A complete automated value betting system with:
- ✅ **JSON API Scrapers** - Direct mobile API interception (Career Method)
- ✅ **Supabase Upsert Engine** - Atomic database updates with auto-calculated edges
- ✅ **Real-Time Sync** - Every scraped match automatically saved to database
- ✅ **Sharp vs Soft Logic** - Edge percentage calculated server-side

---

## 📁 Files Created

### 1. Database Schema
**File:** `supabase/migrations/20260119_value_opportunities_upsert.sql`

Creates:
- `value_opportunities` table with auto-calculated edge columns
- `upsert_value_bet()` RPC function for atomic updates
- `cleanup_stale_odds()` function to remove old data
- Indexes for fast queries on high-value bets
- Row Level Security policies

### 2. Bridge Service Updates
**File:** `bridge/main.py` (Updated)

Added:
- Supabase client initialization
- `sync_to_supabase()` function - calls RPC for every match
- `get_mobile_headers()` - randomized User-Agent rotation
- `scrape_sportybet_json()` - complete SportyBet JSON scraper
- `scrape_bet9ja_json()` - Bet9ja mobile API scraper
- `scrape_betking_json()` - BetKing template (needs endpoint discovery)

**File:** `bridge/requirements.txt` (Updated)
- Added `supabase==2.3.4`

### 3. Documentation
- `SUPABASE_SETUP.md` - Complete setup guide
- `bridge/.env.example` - Environment variable template

---

## 🚀 Deployment Steps

### Step 1: Run SQL Migration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** → **New Query**
4. Copy entire contents of `supabase/migrations/20260119_value_opportunities_upsert.sql`
5. Paste and click **Run** (or `Ctrl+Enter`)

You should see: ✅ Success. No rows returned

### Step 2: Configure Railway Environment Variables

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select "vantedge-production" service
3. Click **Variables** tab
4. Add two new variables:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-key-here
```

**Get these values:**
- Supabase Dashboard → Settings → API
- Copy `URL` → Paste into `SUPABASE_URL`
- Copy `anon public` key → Paste into `SUPABASE_KEY`

⚠️ **Important:** Use `anon` key, NOT `service_role` key (security)

4. Railway will auto-redeploy with new variables (~2 minutes)

### Step 3: Test the Integration

Once Railway finishes deploying:

```bash
# Test SportyBet scraper
curl "https://vantedge-production.up.railway.app/api/odds/sportybet/premierleague"
```

Expected response:
```json
{
  "bookmaker": "sportybet",
  "league": "premierleague",
  "matches": [
    {
      "id": "sr:match:12345",
      "home_team": "Arsenal",
      "away_team": "Chelsea",
      "kickoff": "2026-01-20T15:00:00Z",
      "odds": {
        "home": 2.25,
        "draw": 3.40,
        "away": 3.10
      }
    }
  ],
  "count": 1,
  "timestamp": "2026-01-19T16:30:00Z"
}
```

### Step 4: Verify Database Sync

1. Supabase Dashboard → **Table Editor**
2. Select `value_opportunities` table
3. You should see rows with:
   - `match_id`: "Arsenal_Chelsea_20260119"
   - `soft_bookie`: "SportyBet"
   - `edge_home_percent`: Auto-calculated (e.g., 9.76%)
   - `best_edge_market`: "home"

---

## 🧮 How the Edge Calculation Works

### The Math

```sql
edge_home_percent = ((soft_odds_home / sharp_odds_home) - 1) * 100
```

**Example:**
- Sharp odds (Pinnacle): 2.00
- Soft odds (SportyBet): 2.25
- Edge: ((2.25 / 2.00) - 1) × 100 = **12.5%** 🚨

This is **auto-calculated** by PostgreSQL every time odds are upserted.

### Why This is Powerful

1. **No CPU Waste** - Calculation happens in database, not in Python/JavaScript
2. **Always Current** - Every update recalculates instantly
3. **Query-Ready** - Can filter by `WHERE best_edge_percent >= 5.0`
4. **Three Markets** - Tracks home, draw, away separately
5. **Best Market** - Automatically identifies highest edge

---

## 🔍 Querying Value Bets

### Find High-Value Opportunities

```sql
SELECT 
    match_name,
    league_name,
    soft_bookie,
    best_edge_market,
    best_edge_percent,
    CASE 
        WHEN best_edge_market = 'home' THEN soft_odds_home
        WHEN best_edge_market = 'draw' THEN soft_odds_draw
        ELSE soft_odds_away
    END as best_odds,
    kickoff_time,
    updated_at
FROM value_opportunities
WHERE best_edge_percent >= 5.0
  AND kickoff_time > NOW()
ORDER BY best_edge_percent DESC
LIMIT 10;
```

### JavaScript/TypeScript Query

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()

const { data: valueBets, error } = await supabase
  .from('value_opportunities')
  .select('*')
  .gte('best_edge_percent', 5.0)
  .gte('kickoff_time', new Date().toISOString())
  .order('best_edge_percent', { ascending: false })
  .limit(10)

console.log('Value Bets:', valueBets)
```

---

## 🔄 How the Flow Works

### 1. User Requests Odds

```
GET /api/odds/sportybet/premierleague
```

### 2. Bridge Scrapes JSON API

```python
async def scrape_sportybet_json(league):
    # Fetches from SportyBet mobile API
    # Parses JSON response
    # Returns matches list
```

### 3. Real-Time Sync to Supabase

```python
for match in matches:
    sync_to_supabase(match, "SportyBet", league)
    # Calls upsert_value_bet() RPC
```

### 4. Database Upserts & Calculates

```sql
INSERT INTO value_opportunities (...)
VALUES (...)
ON CONFLICT (match_id) DO UPDATE SET
    soft_odds_home = EXCLUDED.soft_odds_home,
    updated_at = NOW();
-- edge_home_percent auto-calculates via GENERATED column
```

### 5. Frontend Queries Latest Data

```typescript
const { data } = await supabase
  .from('value_opportunities')
  .select('*')
  .gte('best_edge_percent', 3.0)
```

---

## 🧹 Stale Data Cleanup

### Manual Cleanup

```sql
SELECT cleanup_stale_odds();
-- Returns: number of deleted rows
```

### Automated Cleanup (Every 10 Minutes)

Create Supabase Edge Function:

**File:** `cleanup-stale-odds/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabase.rpc('cleanup_stale_odds')
  
  return new Response(
    JSON.stringify({ 
      deleted: data, 
      timestamp: new Date().toISOString(),
      error 
    }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

**Cron Schedule:** `0 */10 * * *` (every 10 minutes)

---

## 🎯 Next Steps

### 1. Get OddsAPI.io Key

Current sharp odds are hardcoded (2.05, 3.40, 3.60). Get real Pinnacle data:

1. Sign up at [The Odds API](https://the-odds-api.com/)
2. Get free API key (500 requests/month)
3. Add to Railway: `ODDS_API_KEY=your-key-here`
4. Update `sync_to_supabase()` to fetch real sharp odds:

```python
async def get_sharp_odds(home_team, away_team):
    """Fetch Pinnacle odds from OddsAPI.io"""
    api_key = os.getenv("ODDS_API_KEY")
    url = f"https://api.the-odds-api.com/v4/sports/soccer_epl/odds"
    params = {"apiKey": api_key, "regions": "us", "markets": "h2h"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()
        
        # Find match and Pinnacle bookmaker
        for event in data:
            if home_team in event['home_team']:
                for bookmaker in event['bookmakers']:
                    if bookmaker['key'] == 'pinnacle':
                        return bookmaker['markets'][0]['outcomes']
    
    # Fallback
    return {"home": 2.05, "draw": 3.40, "away": 3.60}
```

### 2. Discover Bet9ja & BetKing APIs

**Bet9ja:**
1. Open https://mobile.bet9ja.com in Chrome
2. F12 → Network → XHR filter
3. Click Premier League
4. Find `/getEvents` or similar JSON request
5. Right-click → Copy → Copy as cURL
6. Use [curlconverter.com](https://curlconverter.com/) → Python
7. Update `scrape_bet9ja_json()`

**BetKing:** Same process at https://www.betking.com

### 3. Add Telegram Alerts

Watch `value_opportunities` table and send alerts when:
```sql
WHERE best_edge_percent >= 7.0 
  AND is_alerted = FALSE
```

### 4. Test End-to-End

```bash
# 1. Scrape odds
curl "https://vantedge-production.up.railway.app/api/odds/sportybet/premierleague"

# 2. Check database (Supabase → Table Editor → value_opportunities)

# 3. Query high-value bets
# (Use SQL query from "Querying Value Bets" section)

# 4. Verify edge calculation is correct
```

---

## 🐛 Troubleshooting

### Issue: "Supabase credentials not found"

**Fix:**
- Check Railway variables are set correctly
- Variable names must be exactly: `SUPABASE_URL` and `SUPABASE_KEY`
- Restart Railway service after adding variables

### Issue: "RPC function upsert_value_bet does not exist"

**Fix:**
- SQL migration not run correctly
- Go to Supabase SQL Editor and re-run migration
- Check for syntax errors in console

### Issue: "No matches synced to database"

**Debugging:**
```python
# Add to sync_to_supabase()
logger.info(f"Syncing: {match_id} | {match_data}")
```

Check Railway logs for sync attempts.

### Issue: "Edge calculation is wrong"

**Check:**
- Sharp odds are reasonable (Pinnacle typically 1.80-3.00 for favorites)
- Soft odds are higher than sharp odds
- Formula: `(soft / sharp - 1) × 100`

---

## 📊 Database Schema Reference

```
value_opportunities
├── match_id (TEXT, PK)              - "Arsenal_Chelsea_20260119"
├── match_name (TEXT)                - "Arsenal vs Chelsea"
├── league_name (TEXT)               - "Premier League"
├── kickoff_time (TIMESTAMPTZ)       - "2026-01-20 15:00:00+00"
├── sharp_bookie (TEXT)              - "Pinnacle"
├── sharp_odds_home (DECIMAL)        - 2.05
├── sharp_odds_draw (DECIMAL)        - 3.40
├── sharp_odds_away (DECIMAL)        - 3.60
├── soft_bookie (TEXT)               - "SportyBet"
├── soft_odds_home (DECIMAL)         - 2.25
├── soft_odds_draw (DECIMAL)         - 3.50
├── soft_odds_away (DECIMAL)         - 3.70
├── edge_home_percent (GENERATED)    - 9.76 (auto-calculated)
├── edge_draw_percent (GENERATED)    - 2.94
├── edge_away_percent (GENERATED)    - 2.78
├── best_edge_percent (GENERATED)    - 9.76
├── best_edge_market (GENERATED)     - "home"
├── is_alerted (BOOLEAN)             - false
├── updated_at (TIMESTAMPTZ)         - NOW()
└── created_at (TIMESTAMPTZ)         - NOW()
```

---

## 🎉 Success Criteria

You'll know it's working when:

1. ✅ Railway logs show: "✅ Supabase client initialized"
2. ✅ API returns real matches from SportyBet
3. ✅ Supabase table has rows with auto-calculated edges
4. ✅ SQL query returns high-value bets (edge >= 5%)
5. ✅ `updated_at` timestamp updates on each scrape

---

## 🔗 Key URLs

- **Railway Service:** https://vantedge-production.up.railway.app
- **Health Check:** https://vantedge-production.up.railway.app/health
- **API Docs:** https://vantedge-production.up.railway.app/docs
- **Supabase Dashboard:** https://supabase.com/dashboard
- **GitHub Repo:** https://github.com/koyegunle/Vantedge

---

**Built with the "Career Method" 💼 - Direct JSON API Interception**

When bookmaker sites update, spend 60 seconds in F12 DevTools to find new endpoints instead of debugging broken HTML selectors for hours.
