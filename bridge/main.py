"""
Vantedge Naija Bridge - FastAPI Service
Scrapes Nigerian bookmakers using NaijaBet-Api library
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import List, Dict, Any, Optional
import os
import logging
import httpx
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Supabase client
try:
    from supabase import create_client, Client
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if SUPABASE_URL and SUPABASE_KEY:
        # Create client with minimal options to avoid compatibility issues
        supabase_client: Optional[Client] = create_client(
            supabase_url=SUPABASE_URL,
            supabase_key=SUPABASE_KEY
        )
        logger.info("✅ Supabase client initialized")
    else:
        supabase_client = None
        logger.warning("⚠️ Supabase credentials not configured")
except Exception as e:
    supabase_client = None
    logger.warning(f"⚠️ Supabase initialization failed: {e}")
    import traceback
    logger.error(traceback.format_exc())

# JSON API scraper - The "Career" Method
SCRAPER_AVAILABLE = True
logger.info("✅ Using JSON API scraper (Direct Interception)")

# OddsAPI configuration for sharp bookmaker odds
ODDS_API_KEY = os.getenv("ODDS_API_KEY", "9162d5a3703bba14dd84f046841ffa5a")
ODDS_API_BASE = "https://api.the-odds-api.com/v4"

# Cache for sharp odds (to avoid hitting API limits)
sharp_odds_cache: Dict[str, Dict] = {}

# Initialize FastAPI
app = FastAPI(
    title="Vantedge Naija Bridge",
    description="Odds scraping service for Nigerian bookmakers",
    version="1.0.0"
)

# CORS Configuration
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins + ["*"],  # Allow all in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# League mapping
LEAGUE_MAP = {
    "premierleague": "PREMIERLEAGUE",
    "laliga": "LALIGA",
    "seriea": "SERIEA",
    "bundesliga": "BUNDESLIGA",
    "ligue1": "LIGUE1",
    "npfl": "NPFL",
    "ucl": "UEFA_CHAMPIONS_LEAGUE",
    "europa": "UEFA_EUROPA_LEAGUE"
}


@app.get("/")
async def root():
    """Root endpoint with service info"""
    return {
        "service": "Vantedge Naija Bridge",
        "version": "1.0.0",
        "status": "operational",
        "naijabet_api": "mock_data" if SCRAPER_AVAILABLE else "not_available",
        "endpoints": {
            "health": "/health",
            "bet9ja": "/api/odds/bet9ja/{league}",
            "betking": "/api/odds/betking/{league}",
            "sportybet": "/api/odds/sportybet/{league}"
        },
        "supported_leagues": list(LEAGUE_MAP.keys())
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "naija-bridge",
        "timestamp": datetime.now().isoformat(),
        "scraper_available": SCRAPER_AVAILABLE
    }


async def scrape_bet9ja_simple(league: str) -> List[Dict]:
    """Simple HTTP scraper for Bet9ja (demo/placeholder)"""
    # This is a placeholder - returns mock data
    # In production, you'd parse actual Bet9ja pages or APIs
    logger.info(f"Scraping Bet9ja {league} (HTTP method)")
    
    # Mock data for testing
    return [
        {
            "id": "demo_match_1",
            "home_team": "Arsenal",
            "away_team": "Chelsea", 
            "kickoff": datetime.now().isoformat(),
            "odds": {"home": 2.10, "draw": 3.40, "away": 3.60}
        },
        {
            "id": "demo_match_2",
            "home_team": "Liverpool",
            "away_team": "Manchester United",
            "kickoff": datetime.now().isoformat(),
            "odds": {"home": 1.95, "draw": 3.50, "away": 3.80}
        }
    ]


def get_mobile_headers() -> Dict[str, str]:
    """Generate randomized mobile headers to avoid detection"""
    user_agents = [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36",
    ]
    
    return {
        "User-Agent": random.choice(user_agents),
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "platform": "mobile"
    }


async def fetch_sharp_odds(home_team: str, away_team: str, league: str) -> Dict:
    """
    Fetch sharp bookmaker odds from OddsAPI (Pinnacle)
    Returns dict with home/draw/away odds or None
    """
    if not ODDS_API_KEY:
        logger.debug("OddsAPI key not configured")
        return {"home": None, "draw": None, "away": None}
    
    # Check cache first (cache for 5 minutes)
    cache_key = f"{home_team}_{away_team}".lower().replace(' ', '')
    if cache_key in sharp_odds_cache:
        cached_data = sharp_odds_cache[cache_key]
        if datetime.now().timestamp() - cached_data.get('timestamp', 0) < 300:  # 5 min
            logger.debug(f"Using cached sharp odds for {home_team} vs {away_team}")
            return cached_data['odds']
    
    # Map league to OddsAPI sport key
    sport_map = {
        "premierleague": "soccer_epl",
        "laliga": "soccer_spain_la_liga",
        "seriea": "soccer_italy_serie_a",
        "bundesliga": "soccer_germany_bundesliga",
        "ligue1": "soccer_france_ligue_one",
        "npfl": "soccer_epl",  # Fallback to EPL for unsupported leagues
        "ucl": "soccer_uefa_champs_league",
    }
    
    sport_key = sport_map.get(league.lower(), "soccer_epl")
    
    try:
        url = f"{ODDS_API_BASE}/sports/{sport_key}/odds"
        params = {
            "apiKey": ODDS_API_KEY,
            "regions": "us,uk",
            "markets": "h2h",  # Head-to-head (1X2)
            "oddsFormat": "decimal",
            "bookmakers": "pinnacle"  # Only Pinnacle (sharp bookmaker)
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code != 200:
                logger.warning(f"OddsAPI returned {response.status_code}")
                return {"home": None, "draw": None, "away": None}
            
            data = response.json()
            
            # Find matching game by team names
            for event in data:
                event_home = event.get('home_team', '').lower()
                event_away = event.get('away_team', '').lower()
                
                # Simple fuzzy match (contains)
                if (home_team.lower() in event_home or event_home in home_team.lower()) and \
                   (away_team.lower() in event_away or event_away in away_team.lower()):
                    
                    # Extract Pinnacle odds
                    bookmakers = event.get('bookmakers', [])
                    for bookmaker in bookmakers:
                        if bookmaker.get('key') == 'pinnacle':
                            markets = bookmaker.get('markets', [])
                            for market in markets:
                                if market.get('key') == 'h2h':
                                    outcomes = market.get('outcomes', [])
                                    sharp_odds = {"home": None, "draw": None, "away": None}
                                    
                                    for outcome in outcomes:
                                        name = outcome.get('name', '').lower()
                                        price = outcome.get('price')
                                        
                                        if event_home in name:
                                            sharp_odds['home'] = price
                                        elif event_away in name:
                                            sharp_odds['away'] = price
                                        elif 'draw' in name:
                                            sharp_odds['draw'] = price
                                    
                                    # Cache the result
                                    sharp_odds_cache[cache_key] = {
                                        'odds': sharp_odds,
                                        'timestamp': datetime.now().timestamp()
                                    }
                                    
                                    logger.info(f"✅ Fetched Pinnacle odds for {home_team} vs {away_team}: {sharp_odds}")
                                    return sharp_odds
            
            logger.debug(f"No Pinnacle odds found for {home_team} vs {away_team}")
            return {"home": None, "draw": None, "away": None}
            
    except Exception as e:
        logger.error(f"❌ OddsAPI error: {e}")
        return {"home": None, "draw": None, "away": None}


def sync_to_supabase(match_data: Dict, soft_bookie: str, league: str):
    """
    Sync odds data to Supabase value_opportunities table via RPC
    The "Logic-in-DB" Strategy - Upsert Engine
    """
    if not supabase_client:
        logger.debug("Supabase not configured, skipping sync")
        return
    
    try:
        # Generate unique match ID: HomeTeam_AwayTeam_Date
        date_str = datetime.now().strftime("%Y%m%d")
        home = match_data.get('home_team', '').replace(' ', '')
        away = match_data.get('away_team', '').replace(' ', '')
        match_id = f"{home}_{away}_{date_str}"
        
        # Get odds
        odds = match_data.get('odds', {})
        
        # Fetch sharp odds from OddsAPI (async call wrapped in sync context)
        import asyncio
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        sharp_odds = loop.run_until_complete(
            fetch_sharp_odds(
                match_data.get('home_team', ''),
                match_data.get('away_team', ''),
                league
            )
        )
        
        # Call the RPC function for atomic upsert
        supabase_client.rpc("upsert_value_bet", {
            "p_match_id": match_id,
            "p_match_name": f"{match_data.get('home_team')} vs {match_data.get('away_team')}",
            "p_league": league,
            "p_kickoff": match_data.get('kickoff'),
            "p_sharp_odds_home": sharp_odds.get('home'),
            "p_sharp_odds_draw": sharp_odds.get('draw'),
            "p_sharp_odds_away": sharp_odds.get('away'),
            "p_soft_bookie": soft_bookie,
            "p_soft_odds_home": odds.get('home'),
            "p_soft_odds_draw": odds.get('draw'),
            "p_soft_odds_away": odds.get('away')
        }).execute()
        
        logger.debug(f"✅ Synced to Supabase: {match_id}")
        
    except Exception as e:
        logger.error(f"❌ Supabase sync error: {str(e)}")


async def scrape_sportybet_json(league: str) -> List[Dict]:
    """
    Scrape SportyBet using their factsCenter API (POST method)
    """
    import time
    url = "https://www.sportybet.com/api/ng/factsCenter/events"
    
    # Match the exact headers from the browser
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "clientid": "web",
        "platform": "web",
        "operid": "2"
    }

    # Map leagues to SportyBet Tournament IDs
    # These IDs are examples and might need verification
    tournament_ids = {
        "premierleague": ["sr:tournament:17"],
        "laliga": ["sr:tournament:8"],
        "seriea": ["sr:tournament:23"],
        "bundesliga": ["sr:tournament:35"],
        "ligue1": ["sr:tournament:34"],
        "npfl": [] 
    }
    
    tid = tournament_ids.get(league, [])
    
    # POST Payload
    payload = [{
        "sportId": "sr:sport:1",
        "marketId": "1,18", 
        "upcoming": True,
        "limit": 50
    }]

    if tid:
         # Add nested tournamentId structure: [[{"id": "..."}]]
         payload[0]["tournamentId"] = [[{"id": t} for t in tid]]
    
    try:
        async with httpx.AsyncClient(http2=True, timeout=30.0) as client:
            # Changed to POST
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"📊 SportyBet API response structure: {list(data.keys()) if isinstance(data, dict) else type(data)}")
            
            matches = []
            
            # The API returns odds data in a different format
            if isinstance(data, list):
                # Response is often a list of events directly when doing POST
                events_source = data
                
                logger.info(f"✅ Found {len(events_source)} items in response")
                
                for event in events_source[:10]:
                    try:
                        # Parse standard SportyBet event structure
                        match = {
                            "id": event.get("id", event.get("eventId", "")),
                            "home_team": event.get("homeTeamName", event.get("home", {}).get("name", "")),
                            "away_team": event.get("awayTeamName", event.get("away", {}).get("name", "")),
                            "kickoff": event.get("scheduledTime", event.get("startTime", "")),
                            "odds": {}
                        }
                        
                        # Extract odds
                        markets = event.get("markets", [])
                        for market in markets:
                            if market.get("id") == "1" or market.get("marketId") == "1" or market.get("name") == "1X2":
                                outcomes = market.get("outcomes", [])
                                for outcome in outcomes:
                                    # Odds are often strings or multiplied by 100
                                    raw_odds = outcome.get("odds", 0)
                                    try:
                                        # Handle various formats: "2.10", 210, etc.
                                        val = float(raw_odds)
                                        if val > 100: val = val / 100
                                    except:
                                        val = 0
                                        
                                    # Map outcomes
                                    desc = outcome.get("desc", outcome.get("id", "")).lower()
                                    if desc == "1" or desc == "home":
                                        match["odds"]["home"] = val
                                    elif desc == "x" or desc == "draw":
                                        match["odds"]["draw"] = val
                                    elif desc == "2" or desc == "away":
                                        match["odds"]["away"] = val
                        
                        if match["home_team"] and match["away_team"] and match["odds"].get("home"):
                            matches.append(match)
                            sync_to_supabase(match, "SportyBet", league)
                            
                    except Exception as parse_error:
                        logger.warning(f"Failed to parse event: {parse_error}")
                        continue

            logger.info(f"✅ SportyBet JSON: Found {len(matches)} matches")
            return matches
            
    except Exception as e:
        logger.error(f"❌ SportyBet JSON error: {e}")
        return []


async def scrape_bet9ja_json(league: str) -> List[Dict]:
    """
    Scrape Bet9ja using their mobile JSON API
    """
    # FIXED: Updated endpoint | Old mobile API (301) -> New Desktop API
    # 19/01/26: Updated to use GetUpcomingEvents with correct params
    url = "https://sports.bet9ja.com/desktop/feapi/PalazzoRest/GetUpcomingEvents"
    headers = get_mobile_headers()
    
    # Map league to Bet9ja competition IDs (Approximate - these change)
    # EPL: 169 (or similar), LaLiga: 181, SerieA: 173
    comp_ids = {
        "premierleague": "169",
        "laliga": "181", 
        "seriea": "173",
        "bundesliga": "177",
        "ligue1": "174", 
        "npfl": "919" 
    }
    
    comp_id = comp_ids.get(league, "169")  # Default to EPL if unknown
    
    params = {
        "boot_market_id": "1",  # 1X2 market
        "competition_id": comp_id,
        "page_num": "1",
        "page_size": "20",      # Required param
        "game_ids": ""          # Required empty string
    }
    
    try:
        async with httpx.AsyncClient(http2=True, timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                matches = []
                
                # Bet9ja structure: B.Events
                events = data.get("B", {}).get("Events", [])
                
                for event in events:
                    match = {
                        "id": str(event.get("EventId", "")),
                        "home_team": event.get("HomeTeamName", ""),
                        "away_team": event.get("AwayTeamName", ""),
                        "kickoff": event.get("EventDate", ""), # Often in "Date(123123123)" format
                        "odds": {}
                    }
                    
                    # Extract 1x2 odds
                    # Odds are usually in event['Markets'][0]['Outcomes']
                    markets = event.get("Markets", [])
                    for market in markets:
                        if market.get("TemplateId") == 125869: # Standard 1X2 ID (check this)
                            for outcome in market.get("Outcomes", []):
                                # Outcome names are usually 1, X, 2
                                name = outcome.get("OutcomeName", "")
                                price = outcome.get("Odds", 0)
                                
                                if name == "1":
                                    match["odds"]["home"] = price
                                elif name == "X":
                                    match["odds"]["draw"] = price
                                elif name == "2":
                                    match["odds"]["away"] = price
                    
                    # Fallback check if precise market ID varies
                    if not match["odds"]:
                         # Just look for the first market if it has outcomes 1, X, 2
                         if markets and len(markets) > 0:
                             outcomes = markets[0].get("Outcomes", [])
                             for outcome in outcomes:
                                 name = outcome.get("OutcomeName", "")
                                 price = outcome.get("Odds", 0)
                                 if name == "1": match["odds"]["home"] = price
                                 elif name == "X": match["odds"]["draw"] = price
                                 elif name == "2": match["odds"]["away"] = price

                    if match["home_team"] and match["away_team"]:
                        matches.append(match)
                        sync_to_supabase(match, "Bet9ja", league)
                
                return matches
            else:
                # Fallback to mock data
                logger.warning(f"Bet9ja mobile API returned {response.status_code}, using mock data")
                return await scrape_bet9ja_simple(league)
                
    except Exception as e:
        logger.error(f"❌ Bet9ja JSON error: {e}")
        return await scrape_bet9ja_simple(league)


async def scrape_betking_json(league: str) -> List[Dict]:
    """
    Scrape BetKing using their JSON API
    TODO: Discover BetKing's actual mobile API endpoint via F12 Network tab
    """
    # For now, using SportyBet template as reference
    logger.warning("BetKing scraper using SportyBet template - needs actual endpoint")
    return await scrape_sportybet_json(league)


def normalize_odds_data(raw_data: Any, bookmaker: str, league: str) -> Dict[str, Any]:
    """
    Normalize odds data from NaijaBet-Api into standard format
    
    Note: Actual data structure depends on NaijaBet-Api response format
    This is a template that may need adjustment based on real data
    """
    try:
        # If raw_data is already a list of matches
        if isinstance(raw_data, list):
            matches = []
            for item in raw_data:
                match = {
                    "id": item.get("id", f"match_{len(matches)}"),
                    "home_team": item.get("home_team", item.get("homeTeam", "")),
                    "away_team": item.get("away_team", item.get("awayTeam", "")),
                    "kickoff": item.get("kickoff", item.get("start_time", "")),
                    "odds": item.get("odds", {}),
                }
                matches.append(match)
            
            return {
                "bookmaker": bookmaker,
                "league": league,
                "matches": matches,
                "timestamp": datetime.now().isoformat(),
                "count": len(matches)
            }
        
        # Default structure
        return {
            "bookmaker": bookmaker,
            "league": league,
            "raw_data": raw_data,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error normalizing data: {e}")
        return {
            "bookmaker": bookmaker,
            "league": league,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@app.get("/api/odds/bet9ja/{league}")
async def get_bet9ja_odds(league: str):
    """
    Fetch Bet9ja odds for a specific league
    
    Args:
        league: League identifier (premierleague, laliga, npfl, etc.)
    
    Returns:
        JSON with matches and odds data
    """
    if not SCRAPER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Scraper not available"
        )
    
    try:
        # Get league ID from map
        league_key = LEAGUE_MAP.get(league.lower())
        if not league_key:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported league. Use one of: {list(LEAGUE_MAP.keys())}"
            )
        
        logger.info(f"🟢 Scraping Bet9ja: {league}")
        
        # Use JSON API scraper
        data = await scrape_bet9ja_json(league)
        
        logger.info(f"✅ Bet9ja scrape complete: {len(data)} matches")
        
        return normalize_odds_data(data, "bet9ja", league)
        
    except Exception as e:
        logger.error(f"❌ Bet9ja error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Bet9ja scraping failed: {str(e)}")


@app.get("/api/odds/betking/{league}")
async def get_betking_odds(league: str):
    """
    Fetch BetKing odds for a specific league (with Cloudflare bypass)
    
    Args:
        league: League identifier (premierleague, laliga, npfl, etc.)
    
    Returns:
        JSON with matches and odds data
    """
    if not SCRAPER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Scraper not available"
        )
    
    try:
        league_key = LEAGUE_MAP.get(league.lower())
        if not league_key:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported league. Use one of: {list(LEAGUE_MAP.keys())}"
            )
        
        logger.info(f"🟠 Scraping BetKing: {league}")
        
        # Use JSON scraper
        data = await scrape_betking_json(league)
        
        logger.info(f"✅ BetKing scrape complete: {len(data)} matches")
        
        return normalize_odds_data(data, "betking", league)
        
    except Exception as e:
        logger.error(f"❌ BetKing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"BetKing scraping failed: {str(e)}")

@app.get("/api/odds/sportybet/{league}")
async def get_sportybet_odds(league: str):
    """
    Fetch SportyBet odds for a specific league
    
    Args:
        league: League identifier (premierleague, laliga, npfl, etc.)
    
    Returns:
        JSON with matches and odds data
    """
    if not SCRAPER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Scraper not available"
        )
    
    try:
        league_key = LEAGUE_MAP.get(league.lower())
        if not league_key:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported league. Use one of: {list(LEAGUE_MAP.keys())}"
            )
        
        logger.info(f"🔵 Scraping SportyBet: {league}")
        
        # Use JSON API scraper
        data = await scrape_sportybet_json(league)
        
        logger.info(f"✅ SportyBet scrape complete: {len(data)} matches")
        
        return normalize_odds_data(data, "sportybet", league)
        
    except Exception as e:
        logger.error(f"❌ SportyBet error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"SportyBet scraping failed: {str(e)}")


@app.get("/api/odds/all/{league}")
async def get_all_bookmakers(league: str):
    """
    Fetch odds from all Nigerian bookmakers in parallel
    
    Args:
        league: League identifier (premierleague, laliga, npfl, etc.)
    
    Returns:
        JSON with data from all bookmakers
    """
    if not SCRAPER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Scraper not available"
        )
    
    results = {
        "league": league,
        "timestamp": datetime.now().isoformat(),
        "bookmakers": {}
    }
    
    # Fetch from all bookmakers in parallel
    for bookie_name, endpoint_func in [
        ("bet9ja", get_bet9ja_odds),
        ("betking", get_betking_odds),
        ("sportybet", get_sportybet_odds)
    ]:
        try:
            data = await endpoint_func(league)
            results["bookmakers"][bookie_name] = data
        except Exception as e:
            logger.error(f"Failed to fetch {bookie_name}: {e}")
            results["bookmakers"][bookie_name] = {
                "error": str(e),
                "status": "failed"
            }
    
    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )
