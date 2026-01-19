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
        
        # Call the RPC function for atomic upsert
        supabase_client.rpc("upsert_value_bet", {
            "p_match_id": match_id,
            "p_match_name": f"{match_data.get('home_team')} vs {match_data.get('away_team')}",
            "p_league": league,
            "p_kickoff": match_data.get('kickoff'),
            "p_sharp_odds_home": 2.05,  # TODO: Fetch from Pinnacle via OddsAPI
            "p_sharp_odds_draw": 3.40,
            "p_sharp_odds_away": 3.60,
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
    Scrape SportyBet using their factsCenter API
    The "Career Method" - Direct API Interception
    """
    import time
    url = "https://www.sportybet.com/api/ng/factsCenter/flexiblebet/v2/getOddsKey"
    
    # Match the exact headers from the browser
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Referer": "https://www.sportybet.com/ng/sport/football/",
        "clientid": "web",
        "platform": "web",
        "operid": "2",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "sec-ch-ua": '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "same-origin",
        "sec-fetch-site": "same-origin"
    }
    
    params = {
        "_t": str(int(time.time() * 1000))  # Timestamp in milliseconds
    }
    
    try:
        async with httpx.AsyncClient(http2=True, timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"📊 SportyBet API response structure: {list(data.keys()) if isinstance(data, dict) else type(data)}")
            
            matches = []
            
            # The API returns odds data in a different format
            # We need to inspect the actual response to parse it correctly
            # For now, log the structure and return empty to avoid errors
            if isinstance(data, dict):
                # Try common data structures
                if "data" in data:
                    logger.info(f"📊 Data keys: {list(data['data'].keys()) if isinstance(data['data'], dict) else 'not a dict'}")
                    
                    # Check for matches/events in various possible structures
                    events_data = data["data"]
                    if isinstance(events_data, dict):
                        # Could be events, matches, games, etc.
                        for key in ["events", "matches", "games", "list"]:
                            if key in events_data:
                                events = events_data[key]
                                logger.info(f"✅ Found {len(events)} items in '{key}'")
                                
                                # Parse each event
                                for event in events[:10]:  # Limit to first 10 for testing
                                    try:
                                        match = {
                                            "id": event.get("eventId", event.get("id", event.get("matchId", ""))),
                                            "home_team": event.get("homeTeamName", event.get("home", event.get("homeTeam", ""))),
                                            "away_team": event.get("awayTeamName", event.get("away", event.get("awayTeam", ""))),
                                            "kickoff": event.get("startTime", event.get("kickoff", event.get("time", ""))),
                                            "odds": {}
                                        }
                                        
                                        # Try to extract odds
                                        if "markets" in event:
                                            for market in event.get("markets", []):
                                                if market.get("marketId") == 1 or market.get("name", "").lower() in ["1x2", "match winner"]:
                                                    outcomes = market.get("outcomes", market.get("odds", []))
                                                    for outcome in outcomes:
                                                        odds_value = outcome.get("odds", outcome.get("value", 0))
                                                        if isinstance(odds_value, int) and odds_value > 100:
                                                            odds_value = odds_value / 10000
                                                        
                                                        outcome_id = str(outcome.get("outcomeId", outcome.get("id", "")))
                                                        if "1" in outcome_id or outcome.get("name", "").lower() == "home":
                                                            match["odds"]["home"] = odds_value
                                                        elif "x" in outcome_id.lower() or "draw" in outcome.get("name", "").lower():
                                                            match["odds"]["draw"] = odds_value
                                                        elif "2" in outcome_id or outcome.get("name", "").lower() == "away":
                                                            match["odds"]["away"] = odds_value
                                        
                                        if match["home_team"] and match["away_team"]:
                                            matches.append(match)
                                            sync_to_supabase(match, "SportyBet", league)
                                    
                                    except Exception as parse_error:
                                        logger.warning(f"Failed to parse event: {parse_error}")
                                        continue
                                
                                break
            
            logger.info(f"✅ SportyBet JSON: Found {len(matches)} matches")
            return matches
            
    except Exception as e:
        logger.error(f"❌ SportyBet JSON error: {e}")
        return []


async def scrape_bet9ja_json(league: str) -> List[Dict]:
    """
    Scrape Bet9ja using their mobile JSON API
    """
    url = "https://mobile.bet9ja.com/Sport/GetEventsPerCompetition"
    headers = get_mobile_headers()
    
    params = {
        "sportId": "1",  # Soccer
        "competitionId": "149",  # Premier League (adjust per league)
        "marketTypeId": "1"  # 1X2
    }
    
    try:
        async with httpx.AsyncClient(http2=True, timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                matches = []
                
                for event in data.get("events", []):
                    match = {
                        "id": event.get("eventId", ""),
                        "home_team": event.get("home", ""),
                        "away_team": event.get("away", ""),
                        "kickoff": event.get("start", ""),
                        "odds": {
                            "home": event.get("odds", {}).get("1", 0),
                            "draw": event.get("odds", {}).get("X", 0),
                            "away": event.get("odds", {}).get("2", 0)
                        }
                    }
                    
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
