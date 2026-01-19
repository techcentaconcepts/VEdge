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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import NaijaBet-Api
NAIJABET_AVAILABLE = False
import_error_details = None

try:
    # NaijaBet-Api v0.2.x structure - try multiple import patterns
    logger.info("Attempting to import NaijaBet-Api...")
    
    # First, check what's installed
    try:
        import pkg_resources
        version = pkg_resources.get_distribution("NaijaBet-Api").version
        logger.info(f"NaijaBet-Api version {version} is installed")
    except:
        logger.warning("Cannot determine NaijaBet-Api version")
    
    # Try different import patterns
    try:
        from NaijaBet_Api.bookmakers import Bet9ja, Betking, Sportybet
        logger.info("✅ Successfully imported from NaijaBet_Api.bookmakers")
    except ImportError as e1:
        logger.warning(f"Pattern 1 failed: {e1}")
        try:
            # Try alternative pattern
            from NaijaBet_Api import Bet9ja, Betking, Sportybet
            logger.info("✅ Successfully imported from NaijaBet_Api directly")
        except ImportError as e2:
            logger.warning(f"Pattern 2 failed: {e2}")
            # Last resort - import module and inspect
            import NaijaBet_Api
            logger.info(f"NaijaBet_Api module contents: {dir(NaijaBet_Api)}")
            raise ImportError(f"Could not find scraper classes. Module contents: {dir(NaijaBet_Api)}")
    
    # Try importing Betid
    Betid = None
    try:
        from NaijaBet_Api.id import Betid
        logger.info("✅ Betid imported successfully")
    except:
        logger.warning("Betid not available, will use league strings directly")
    
    NAIJABET_AVAILABLE = True
    logger.info("✅ NaijaBet-Api loaded successfully")
    logger.info(f"   Bet9ja: {Bet9ja}")
    logger.info(f"   Betking: {Betking}")
    logger.info(f"   Sportybet: {Sportybet}")
    
except ImportError as e:
    NAIJABET_AVAILABLE = False
    import_error_details = str(e)
    logger.error(f"❌ NaijaBet-Api import failed: {e}")
    logger.error("Check Railway build logs for installation errors")
except Exception as e:
    NAIJABET_AVAILABLE = False
    import_error_details = str(e)
    logger.error(f"❌ Unexpected error loading NaijaBet-Api: {e}")
    import traceback
    logger.error(traceback.format_exc())

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
        "naijabet_api": "available" if NAIJABET_AVAILABLE else "not_installed",
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
        "naijabet_available": NAIJABET_AVAILABLE,
        "import_error": import_error_details if not NAIJABET_AVAILABLE else None
    }


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
    if not NAIJABET_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="NaijaBet-Api not installed. Run: pip install NaijaBet-Api"
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
        
        # Initialize scraper and fetch data
        # Use league name directly if Betid not available
        scraper = Bet9ja()
        if Betid:
            league_id = getattr(Betid, league_key, league_key)
            data = scraper.get_league(league_id)
        else:
            # Fallback: try using league key directly
            data = scraper.get_league(league_key)
        
        logger.info(f"✅ Bet9ja scrape complete: {len(data) if isinstance(data, list) else 'unknown'} items")
        
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
    if not NAIJABET_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="NaijaBet-Api not installed. Run: pip install NaijaBet-Api"
        )
    
    try:
        league_key = LEAGUE_MAP.get(league.lower())
        if not league_key:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported league. Use one of: {list(LEAGUE_MAP.keys())}"
            )
        
        logger.info(f"🟠 Scraping BetKing (Cloudflare bypass): {league}")
        
        # Initialize scraper (note: Betking not BetKing)
        scraper = Betking()
        if Betid:
            league_id = getattr(Betid, league_key, league_key)
            data = scraper.get_league(league_id)
        else:
            data = scraper.get_league(league_key)
        
        logger.info(f"✅ BetKing scrape complete: {len(data) if isinstance(data, list) else 'unknown'} items")
        
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
    if not NAIJABET_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="NaijaBet-Api not installed. Run: pip install NaijaBet-Api"
        )
    
    try:
        league_key = LEAGUE_MAP.get(league.lower())
        if not league_key:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported league. Use one of: {list(LEAGUE_MAP.keys())}"
            )
        
        logger.info(f"🔵 Scraping SportyBet: {league}")
        
        # Initialize scraper (note: Sportybet not SportyBet)
        scraper = Sportybet()
        if Betid:
            league_id = getattr(Betid, league_key, league_key)
            data = scraper.get_league(league_id)
        else:
            data = scraper.get_league(league_key)
        
        logger.info(f"✅ SportyBet scrape complete: {len(data) if isinstance(data, list) else 'unknown'} items")
        
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
    if not NAIJABET_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="NaijaBet-Api not installed"
        )
    
    results = {
        "league": league,
        "timestamp": datetime.now().isoformat(),
        "bookmakers": {}
    }
    
    # Try each bookmaker, continue on error
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
