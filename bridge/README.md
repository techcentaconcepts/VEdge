# Vantedge Naija Bridge - FastAPI Service

A Python-based scraping service for Nigerian bookmakers using NaijaBet-Api.

## Features

- ✅ Bet9ja odds scraping
- ✅ BetKing odds scraping (Cloudflare bypass)
- ✅ SportyBet odds scraping
- ✅ CORS enabled for Vercel frontend
- ✅ Health check endpoint
- ✅ Automatic error handling

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install

# Run development server
uvicorn main:app --reload --port 8000

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/api/odds/bet9ja/premierleague
```

## Deployment to Railway

1. Push this `bridge/` folder to GitHub
2. Create new Railway project
3. Connect GitHub repo
4. Set root directory to `bridge/`
5. Railway will auto-detect and deploy

## Environment Variables

No environment variables required for basic functionality.

Optional:
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

## Endpoints

- `GET /health` - Health check
- `GET /api/odds/bet9ja/{league}` - Bet9ja odds
- `GET /api/odds/betking/{league}` - BetKing odds (Cloudflare protected)
- `GET /api/odds/sportybet/{league}` - SportyBet odds

### Supported Leagues

- `premierleague` - English Premier League
- `laliga` - Spanish La Liga
- `seriea` - Italian Serie A
- `bundesliga` - German Bundesliga
- `ligue1` - French Ligue 1
- `npfl` - Nigerian Professional Football League

## Cost

Railway free tier: $5/month credit (enough for this service)
Estimated usage: ~$3-5/month
