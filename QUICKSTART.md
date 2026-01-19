# 🚀 Quick Start: Testing Phase 1

This guide gets you testing the completed Phase 1 features in under 5 minutes.

## Prerequisites Check

- [x] Dev server running: `npm run dev` ✅ (confirmed running)
- [ ] Supabase credentials in `.env.local`
- [ ] Test user account created

---

## 1️⃣ Test Dashboard Bet Tracking (2 minutes)

### A. Access Dashboard
1. Open http://localhost:3000
2. Login with your test account
3. Navigate to `/dashboard`

### B. Add a Test Bet
1. Click **"+ Add Bet"** button (top right)
2. Fill in the form:
   ```
   Bookmaker: Bet9ja
   Sport: Football
   League: Premier League
   Match: Arsenal vs Chelsea
   Market: Match Winner
   Selection: Arsenal
   Odds: 2.50
   Stake: 1000
   ```
3. Click **"Add Bet"**

### C. Verify Stats Update
- Check the 4 stat cards update instantly
- **Total Staked** should show ₦1,000
- **Pending Bets** should show 1
- **Potential Return** should show ₦2,500

### D. Test Bet Settlement
1. In the bets table, find your bet
2. Click the **green checkmark** button (Won)
3. Verify:
   - Profit shows +₦1,500 (green)
   - Win Rate updates
   - Pending count decreases

### E. Test Filters
1. Filter by **Bookmaker**: Select "Bet9ja"
2. Filter by **Outcome**: Select "Won"
3. Bet should still appear
4. Change to "Lost" - bet should disappear

✅ **Dashboard Complete!**

---

## 2️⃣ Configure Browser Extension (3 minutes)

### A. Update Config
1. Open `extension/config.js`
2. Find these lines in your `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   ```
3. Copy values to `config.js`:
   ```javascript
   SUPABASE_URL: 'https://xxxxx.supabase.co',
   SUPABASE_ANON_KEY: 'eyJhbGci...',
   API_URL: 'http://localhost:3000/api',
   ```
4. Save the file

### B. Load Extension in Chrome
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select folder: `C:\Users\Admin\Documents\GitHub\Vantedge\extension`
6. Extension should appear with Vantedge icon

### C. Test Authentication
1. Click the Vantedge extension icon (in toolbar)
2. Enter your login credentials
3. Click **"Sign In"**
4. Should see:
   - Your email displayed
   - Quick stats (may be 0)
   - "Last sync: Never"

### D. Test Manual Sync
1. Click **"Sync Now"** button
2. Status should update to "Last sync: Just now"
3. Check dashboard - should still see your test bet

✅ **Extension Configured!**

---

## 3️⃣ Test Bet Scraping (Real Bet9ja Only)

**⚠️ Note:** Extension only works on **actual Bet9ja website** due to browser security.

### Option A: Test with Real Bet9ja Account
1. Go to https://www.bet9ja.com
2. Log into your Bet9ja account
3. Navigate to **"My Bets"** or **"Bet History"**
4. Extension will automatically scrape visible bets
5. Check extension popup - sync status should update
6. Check dashboard - Bet9ja bets should appear

### Option B: Test Bet Placement Detection
1. Go to Bet9ja sports page
2. Add a selection to bet slip
3. Enter a small stake (e.g., ₦100)
4. **Before placing:** Open extension popup
5. Place the bet
6. Extension should detect and queue for sync
7. Within 1 minute, bet should sync to dashboard

### Verify Sync
- **Extension popup:** "Last sync: Just now"
- **Dashboard:** New bet appears in table
- **Background logs:** Right-click icon → Inspect
  ```
  [Vantedge] Bets queued for sync
  [Vantedge] Synced 1 bets (1 created, 0 updated)
  ```

✅ **End-to-End Flow Complete!**

---

## 🐛 Quick Troubleshooting

### Dashboard Issues

| Issue | Solution |
|-------|----------|
| Stats not updating | Check browser console for errors |
| "Add Bet" form won't open | Verify component imported in page.tsx |
| Bet won't save | Check API route at `/api/bets` - should return 401 if not logged in |

### Extension Issues

| Issue | Solution |
|-------|----------|
| Won't load | Check `chrome://extensions/` for errors |
| Login fails | Verify Supabase credentials in config.js |
| Bets not syncing | 1. Check background worker logs<br>2. Verify dev server is running<br>3. Check you're on real Bet9ja site |
| "Supabase config not set" | Update config.js with real values |

### Debugging Commands

**Check Extension Storage:**
```javascript
// In extension service worker console (right-click icon → Inspect)
chrome.storage.local.get(null, console.log);
```

**Check Sync Queue:**
```javascript
chrome.storage.local.get('syncQueue', (data) => {
  console.log('Queue:', data.syncQueue);
  console.log('Pending:', data.syncQueue.filter(b => !b.synced));
});
```

**Check Auth Token:**
```javascript
chrome.storage.local.get(['authToken', 'userId'], console.log);
```

**Manually Trigger Sync:**
```javascript
chrome.runtime.sendMessage({ type: 'SYNC_NOW' }, console.log);
```

---

## ✅ Success Checklist

Phase 1 is working if you can:

- [ ] Add manual bets via dashboard
- [ ] See stats update in real-time
- [ ] Settle bets (won/lost/void)
- [ ] Delete bets
- [ ] Filter bets by bookmaker/outcome
- [ ] Login to extension
- [ ] View stats in extension popup
- [ ] Trigger manual sync
- [ ] Scrape bets from Bet9ja (if you have account)
- [ ] See synced bets appear in dashboard

---

## 📚 Full Documentation

- **Setup Guide:** [EXTENSION_SETUP.md](EXTENSION_SETUP.md) - Comprehensive extension setup
- **Progress Tracker:** [PROGRESS.md](PROGRESS.md) - Complete development status
- **Full Spec:** [VANTEDGE_SPEC_v4.md](VANTEDGE_SPEC_v4.md) - 1940-line specification

---

## 🎯 What's Next?

After confirming Phase 1 works:

1. **Phase 2:** Odds scraping from multiple bookmakers
2. **Value Detection:** Identify +EV bets automatically
3. **Telegram Alerts:** Get notified of value opportunities
4. **Advanced Analytics:** Kelly Criterion, ROI breakdown

---

**Need Help?**
- Check console logs (browser DevTools)
- Review background worker logs (extension inspector)
- Verify all config values are correct
- Test API endpoints manually with Postman

**Ready to Start?**
1. Update `extension/config.js` with your Supabase credentials
2. Follow steps 1️⃣ → 2️⃣ → 3️⃣ above
3. Report any issues you find!

🚀 Happy testing!
