# Vantedge Naija Bridge - Quick Start

## Installation

1. **Install Python dependencies**
   ```bash
   cd bridge
   pip install -r requirements.txt
   ```

2. **Install Playwright browsers**
   ```bash
   playwright install chromium
   ```

## Local Testing

1. **Start the server**
   ```bash
   uvicorn main:app --reload --port 8000
   ```

2. **Test in another terminal**
   ```bash
   # Health check
   curl http://localhost:8000/health

   # Test Bet9ja
   curl http://localhost:8000/api/odds/bet9ja/premierleague

   # Or run the test script
   python test_bridge.py
   ```

## Deploy to Railway

### Option 1: Railway CLI (Recommended)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

### Option 2: Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repo and set root directory to `bridge/`
5. Railway auto-detects Python and deploys

### Option 3: Manual GitHub Setup

1. Push `bridge/` folder to GitHub
2. Create new Railway project
3. Connect GitHub repo
4. Set build settings:
   - Root Directory: `bridge/`
   - Build Command: `pip install -r requirements.txt && playwright install chromium`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Environment Variables (Railway)

Set these in Railway dashboard:

```
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
```

## Update Vercel Frontend

Add to `.env.local`:
```
NAIJA_BRIDGE_URL=https://your-railway-app.railway.app
```

## Troubleshooting

**"NaijaBet-Api not installed"**
- Run: `pip install NaijaBet-Api`

**"Playwright not found"**
- Run: `playwright install chromium`

**503 errors**
- Check Railway logs
- Verify Playwright installed correctly
- Try redeploying

**Timeout errors**
- Normal for first request (cold start)
- Increase timeout to 60 seconds
- Subsequent requests will be faster

## Cost Estimate

- Railway: $5/month free credit
- Estimated usage: $3-5/month
- Total: Effectively free for MVP testing

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Test endpoints work
3. ✅ Update Vercel environment variables
4. ✅ Create API route in Vercel to call bridge
5. ✅ Test end-to-end odds flow
