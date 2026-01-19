# Setting Up the Vantedge Browser Extension

This guide will help you set up and test the Vantedge extension locally with your development server.

## Prerequisites

- ✅ Vantedge dev server running (`npm run dev`)
- ✅ Chrome or Edge browser
- ✅ Supabase project credentials

## Step 1: Configure the Extension

1. Open `extension/config.js` in your editor

2. Copy values from your `.env.local` file:

```bash
# In your .env.local, find these values:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Update `extension/config.js`:

```javascript
const CONFIG = {
  API_URL: 'http://localhost:3000/api', // Your local dev server
  SUPABASE_URL: 'https://xxxxx.supabase.co', // From .env.local
  SUPABASE_ANON_KEY: 'eyJhbGci...', // From .env.local
  
  SYNC_INTERVAL_MINUTES: 1,
  MAX_QUEUE_SIZE: 100,
  AUTO_SYNC: true,
  SHOW_OVERLAY: true,
  DEBUG_MODE: true,
};
```

## Step 2: Load Extension in Chrome

1. Open Chrome and navigate to:
   ```
   chrome://extensions/
   ```

2. Enable **Developer mode** (toggle in top-right corner)

3. Click **Load unpacked**

4. Navigate to and select:
   ```
   C:\Users\Admin\Documents\GitHub\Vantedge\extension
   ```

5. The Vantedge extension should now appear in your extensions list

## Step 3: Verify Installation

1. Click the **Extensions** icon (puzzle piece) in Chrome toolbar

2. Pin the **Vantedge** extension for easy access

3. Click the Vantedge icon - you should see the login screen

## Step 4: Test Authentication

1. Click the Vantedge extension icon

2. Sign in with your Vantedge account credentials:
   - Email: (your test account email)
   - Password: (your test account password)

3. After successful login, you should see:
   - Your email displayed
   - Quick stats (Profit, Bets, Win Rate)
   - Sync status

## Step 5: Test Bet Scraping (Bet9ja)

**Important:** The extension only works on **actual Bet9ja pages** due to CORS and security restrictions.

### Option A: Test with Real Bet9ja
1. Go to https://www.bet9ja.com
2. Log into your Bet9ja account
3. Navigate to "My Bets" or place a test bet
4. The extension will automatically scrape and sync

### Option B: Inspect Console for Testing
1. Right-click the Vantedge icon → **Inspect**
2. This opens the service worker DevTools
3. Manually test sync:
   ```javascript
   // In the console
   chrome.storage.local.get('syncQueue', (data) => {
     console.log('Sync queue:', data.syncQueue);
   });
   ```

## Step 6: Verify Syncing

1. After placing a bet on Bet9ja, check:
   - Extension popup shows "Last sync: Just now"
   - Your Vantedge dashboard at http://localhost:3000/dashboard
   - Bet should appear in the bets table

2. Check background worker logs:
   - Right-click Vantedge icon → **Inspect**
   - Console tab shows sync messages:
     ```
     [Vantedge] Bet9ja integration ready
     [Vantedge] Bet queued for sync: Team A vs Team B
     [Vantedge] Synced 1 bets (1 created, 0 updated)
     ```

## Debugging

### Extension Not Loading
- Check for errors in `chrome://extensions/`
- Click **Errors** button on Vantedge extension
- Verify all files exist in extension folder

### Authentication Failed
- Verify Supabase credentials in `config.js`
- Check that user exists in your database
- Try logging into web app first at http://localhost:3000/login

### Bets Not Syncing
1. **Check background worker logs:**
   - Right-click Vantedge icon → Inspect
   - Look for error messages

2. **Verify API endpoint:**
   - Dev server should be running on `http://localhost:3000`
   - Test manually: `http://localhost:3000/api/bets` (should return 401 if not authenticated)

3. **Check sync queue:**
   ```javascript
   // In service worker console
   chrome.storage.local.get(['syncQueue', 'authToken'], console.log);
   ```

### Content Script Not Working on Bet9ja
1. **Verify you're on the actual Bet9ja site:**
   - Extension only works on `https://www.bet9ja.com/*`
   - Not on localhost or test pages

2. **Check content script loaded:**
   - Open DevTools on Bet9ja page
   - Sources tab → Content Scripts → should see `bet9ja.js`

3. **View content script logs:**
   - Console on Bet9ja page should show:
     ```
     [Vantedge] Bet9ja content script loaded
     [Vantedge] Bet9ja integration ready
     ```

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Login works with valid credentials
- [ ] Logout clears auth state
- [ ] Stats display in popup (may be 0 initially)
- [ ] Sync status updates after sync
- [ ] Manual "Sync Now" button works
- [ ] Bets sync from Bet9ja to dashboard
- [ ] Background worker logs show sync activity

## Common Issues

### "Supabase config not set" Error
**Solution:** Update `config.js` with your actual Supabase credentials

### "Sync failed" Error
**Solution:** 
1. Check dev server is running
2. Verify API URL in config.js matches your server
3. Check service worker console for detailed error

### Bet Not Detected on Bet9ja
**Solution:**
1. Verify you're on the bet history page or bet slip
2. Wait a few seconds for page to load fully
3. Check DevTools console for scraper errors
4. Bet9ja may have changed their HTML structure - selectors need updating

### Database Permission Errors
**Solution:**
1. Verify RLS policies allow authenticated users to insert/update bets
2. Check user is authenticated (authToken exists in storage)
3. Verify user_id in bet data matches authenticated user

## Next Steps

Once the extension is working locally:

1. **Test on Production:**
   - Update `config.js` with production API URL
   - Upload to Chrome Web Store (private for now)

2. **Add More Bookmakers:**
   - SportyBet scraper
   - BetKing scraper

3. **Enhance Features:**
   - Live odds overlays
   - Value bet highlighting
   - Desktop notifications

## Support

If you encounter issues:
1. Check all console logs (service worker, content script, popup)
2. Verify configuration values
3. Test API endpoints manually with Postman
4. Review recent code changes in bet sync endpoint
