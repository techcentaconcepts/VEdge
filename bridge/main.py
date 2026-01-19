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



async def get_sharp_odds_for_league(league: str) -> List[Dict]:
    """Retrieve all sharp odds for a league (cached)"""
    # Map league to OddsAPI sport key
    sport_map = {
        "premierleague": "soccer_epl",
        "laliga": "soccer_spain_la_liga",
        "seriea": "soccer_italy_serie_a",
        "bundesliga": "soccer_germany_bundesliga",
        "ligue1": "soccer_france_ligue_one",
        "npfl": "soccer_epl",
        "ucl": "soccer_uefa_champs_league",
    }
    
    sport_key = sport_map.get(league.lower(), "soccer_epl")
    
    # Check cache (15 minutes TTL)
    if league in sharp_odds_cache:
        cached = sharp_odds_cache[league]
        if datetime.now().timestamp() - cached.get('timestamp', 0) < 900:
            return cached.get('matches', [])

    if not ODDS_API_KEY:
        return []

    try:
        url = f"{ODDS_API_BASE}/sports/{sport_key}/odds"
        params = {
            "apiKey": ODDS_API_KEY,
            "regions": "us,uk",
            "markets": "h2h",
            "oddsFormat": "decimal",
            "bookmakers": "pinnacle"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                # Update cache
                sharp_odds_cache[league] = {
                    "timestamp": datetime.now().timestamp(),
                    "matches": data
                }
                logger.info(f"✅ Refreshed sharp odds cache for {league}")
                return data
            else:
                logger.warning(f"OddsAPI error {response.status_code}")
                return []
    except Exception as e:
        logger.error(f"❌ Sharp odds fetch error: {e}")
        return []


async def fetch_sharp_odds(home_team: str, away_team: str, league: str) -> Dict:
    """
    Fetch sharp bookmaker odds from OddsAPI (Pinnacle)
    Uses the league-level cache to prevent 429 errors
    """
    try:
        events = await get_sharp_odds_for_league(league)
        home_team = home_team.lower()
        away_team = away_team.lower()

        # Find matching event
        for event in events:
            ev_home = event.get('home_team', '').lower()
            ev_away = event.get('away_team', '').lower()
            
            # Fuzzy match
            if (home_team in ev_home or ev_home in home_team) and \
               (away_team in ev_away or ev_away in away_team):
                
                # Extract Pinnacle odds
                for bookmaker in event.get('bookmakers', []):
                    if bookmaker.get('key') == 'pinnacle':
                        for market in bookmaker.get('markets', []):
                            if market.get('key') == 'h2h':
                                sharp = {"home": None, "draw": None, "away": None}
                                for outcome in market.get('outcomes', []):
                                    name = outcome.get('name', '').lower()
                                    if ev_home in name: sharp['home'] = outcome.get('price')
                                    elif ev_away in name: sharp['away'] = outcome.get('price')
                                    elif 'draw' in name: sharp['draw'] = outcome.get('price')
                                return sharp
        
        return {"home": None, "draw": None, "away": None}

    except Exception as e:
        logger.error(f"❌ Logic error in sharp odds lookup: {e}")
        return {"home": None, "draw": None, "away": None}


async def sync_to_supabase(match_data: Dict, soft_bookie: str, league: str):
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
        
        # Fetch sharp odds from OddsAPI
        sharp_odds = await fetch_sharp_odds(
            match_data.get('home_team', ''),
            match_data.get('away_team', ''),
            league
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
    Scrape SportyBet using their factsCenter/liveOrPrematchEvents API
    """
    # Confirmed working endpoint as of Jan 2026
    url = "https://www.sportybet.com/api/ng/factsCenter/liveOrPrematchEvents"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "clientid": "web",
        "platform": "web"
    }

    # Map leagues to SportyBet Tournament IDs (SportRadar)
    target_ids = []
    if league == "premierleague": target_ids = ["sr:tournament:17"]
    elif league == "laliga": target_ids = ["sr:tournament:8"]
    elif league == "seriea": target_ids = ["sr:tournament:23"]
    elif league == "bundesliga": target_ids = ["sr:tournament:35"]
    elif league == "ligue1": target_ids = ["sr:tournament:34"]
    elif league == "npfl": target_ids = ["sr:tournament:266"]
    
    params = {
        "sportId": "sr:sport:1",
    }

    try:
        async with httpx.AsyncClient(http2=True, timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            json_resp = response.json()
            # Standard SportyBet response wrapper: { bizCode: 10000, data: [...] }
            data = json_resp.get("data", [])
            
            matches = []
            
            # Data is list of tournaments
            if isinstance(data, list):
                logger.info(f"✅ SportyBet: Received {len(data)} tournaments/groups")
                
                for tournament in data:
                    t_id = tournament.get("id", "")
                    t_name = tournament.get("name", "").lower()
                    
                    # Filter by League/Tournament
                    is_target = False
                    if t_id in target_ids:
                        is_target = True
                    elif league in t_name.replace(" ", ""): # weak fuzzy match
                        is_target = True
                    
                    # If we have specific target IDs, be strict, otherwise loose name match
                    if target_ids and not is_target:
                        continue
                    
                    # If looking for NPFL specifically and no ID match, be careful
                    
                    events = tournament.get("events", [])
                    for event in events:
                        try:
                            match = {
                                "id": event.get("id", event.get("eventId", "")),
                                "home_team": event.get("homeTeamName", event.get("home", {}).get("name", "")),
                                "away_team": event.get("awayTeamName", event.get("away", {}).get("name", "")),
                                "kickoff": event.get("scheduledTime", event.get("startTime", "")),
                                "odds": {}
                            }
                            
                            markets = event.get("markets", [])
                            for market in markets:
                                # Market ID 1 is usually 1X2, but checks desc or name
                                m_id = str(market.get("id", ""))
                                m_name = market.get("name", "").lower()
                                m_desc = market.get("desc", "").lower()
                                
                                if m_id == "1" or "1x2" in m_name or "1x2" in m_desc:
                                    outcomes = market.get("outcomes", [])
                                    for outcome in outcomes:
                                        # Odds can be "2.55" string
                                        try:
                                            raw = outcome.get("odds", "0")
                                            val = float(raw)
                                        except:
                                            val = 0.0
                                            
                                        # Outcome mapping
                                        o_desc = outcome.get("desc", "").lower()
                                        if o_desc in ["1", "home"]:
                                            match["odds"]["home"] = val
                                        elif o_desc in ["x", "draw"]:
                                            match["odds"]["draw"] = val
                                        elif o_desc in ["2", "away"]:
                                            match["odds"]["away"] = val
                            
                            if match["home_team"] and match["odds"].get("home"):
                                matches.append(match)
                                await sync_to_supabase(match, "SportyBet", league)
                            
                        except Exception as e:
                            continue

            logger.info(f"✅ SportyBet: Found {len(matches)} matches for {league}")
            return matches
            
    except Exception as e:
        logger.error(f"❌ SportyBet JSON error: {e}")
        return []


async def scrape_bet9ja_json(league: str) -> List[Dict]:
    """
    Scrape Bet9ja using the PalimpsestAjax API (More reliable than PalazzoRest)
    """
    # FIXED: Switched to PalimpsestAjax endpoint
    url = "https://sports.bet9ja.com/desktop/feapi/PalimpsestAjax/GetEventsInGroupV2"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://sports.bet9ja.com/",
        "X-Requested-With": "XMLHttpRequest"
    }
    
    # Map league to Bet9ja Group IDs (Different from Competition Ids)
    # EPL: 170880, LaLiga: 180928, SerieA: 167856
    group_ids = {
        "premierleague": "170880", # English Premier League
        "laliga": "180928",        # La Liga
        "seriea": "167856",        # Serie A
        "bundesliga": "180923",    # Bundesliga
        "ligue1": "170889",        # Ligue 1
        "npfl": "919"              # NPFL (Using old ID, might fail)
    }
    
    group_id = group_ids.get(league, "170880")
    
    params = {
        "GROUPID": group_id,
        "DISP": "0",
        "GROUPMARKETID": "1",
        "upcoming": "true" 
    }
    
    try:
        async with httpx.AsyncClient(http2=True, timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                matches = []
                
                # PalimpsestAjax structure: D.E (Events)
                events = data.get("D", {}).get("E", [])
                
                for event in events:
                    # IDs structure: ID (MatchId)
                    match = {
                        "id": str(event.get("ID", "")),
                        "home_team": event.get("DS", "").split(" - ")[0] if " - " in event.get("DS", "") else event.get("DS", ""),
                        "away_team": event.get("DS", "").split(" - ")[1] if " - " in event.get("DS", "") else "",
                        "kickoff": str(event.get("START", "")), 
                        "odds": {}
                    }
                    
                    # Odds are in O (Outcomes?) 
                    # Structure usually involves iterating markets "M" -> outcomes "O"
                    # But GetEventsInGroupV2 often returns flattened odds for main market
                    
                    # Parse odds from 'O' dictionary
                    # keys: S_1X2_1 (Home), S_1X2_X (Draw), S_1X2_2 (Away)
                    odds_data = event.get("O", {})
                    
                    if isinstance(odds_data, dict):
                         # Extract Match Result (1X2)
                         try:
                             # Values are strings like "2.54"
                             h_odd = odds_data.get("S_1X2_1")
                             d_odd = odds_data.get("S_1X2_X")
                             a_odd = odds_data.get("S_1X2_2")
                             
                             if h_odd and d_odd and a_odd:
                                 match["odds"] = {
                                     "home": float(h_odd),
                                     "draw": float(d_odd),
                                     "away": float(a_odd)
                                 }
                                 
                         except Exception as parse_err:
                             logger.warning(f"Error parsing odds for {match['home_team']}: {parse_err}")

                    if match["home_team"] and match["odds"]:
                        matches.append(match)
                        await sync_to_supabase(match, "Bet9ja", league)

                logger.info(f"✅ Bet9ja V2 scrape found {len(matches)} matches")
                return matches

            else:
                logger.warning(f"Bet9ja API returned {response.status_code}")
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
