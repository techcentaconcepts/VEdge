# Vantedge Browser Extension

Chrome/Edge extension for automatic bet tracking from Nigerian bookmakers.

## Features

- 🎯 **Automatic Bet Detection**: Scrapes bets from Bet9ja, SportyBet, BetKing
- 🔄 **Real-time Sync**: Syncs bets to your Vantedge dashboard
- 📊 **Bet History**: Extracts historical bets from your betting account
- 🔐 **Secure Auth**: Uses Supabase authentication

## Quick Setup

### 1. Configure API Credentials

Edit `config.js` and update with your values from `.env.local`:

```javascript
SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co'
SUPABASE_ANON_KEY: 'your-anon-key-here'
API_URL: 'http://localhost:3000/api' // or production URL
```

### 2. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension` folder
5. The Vantedge icon should appear in your toolbar

### 3. Login & Sync

1. Click the Vantedge extension icon
2. Enter your Vantedge account credentials
3. The extension will start syncing your bets automatically

## Supported Bookmakers

### Phase 1 (Current)
- ✅ **Bet9ja** - Full support

### Phase 2 (Planned)
- ⏳ **SportyBet**
- ⏳ **BetKing**

## File Structure

```
extension/
├── manifest.json           # Extension manifest (v3)
├── config.js              # Configuration (UPDATE THIS)
├── background.js          # Service worker (auth & sync)
├── content-scripts/       # Page scrapers
│   ├── bet9ja.js         # Bet9ja scraper
│   ├── sportybet.js      # SportyBet scraper
│   └── betking.js        # BetKing scraper
├── popup/                 # Extension popup UI
│   ├── popup.html
│   └── popup.js
└── icons/                # Extension icons
```

## Development

### Testing Locally

1. Start Vantedge dev server: `npm run dev`
2. Load extension (see step 2 above)
3. Navigate to Bet9ja and place a test bet
4. Check extension console (right-click icon → Inspect service worker)

### Debugging

- **Content Script**: Open DevTools on bookmaker page
- **Background Worker**: Right-click extension icon → Inspect
- **Popup**: Right-click extension icon → Inspect popup
├── options/
│   ├── options.html        # Settings page
│   └── options.js          # Settings logic
├── styles/
│   └── popup.css           # Popup styles
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Building for Production

```bash
# From project root
cd extension

# Create zip for Chrome Web Store
zip -r ../vantedge-extension.zip . -x "*.md" -x ".git/*"
```

## Privacy

- Only scrapes data from bookmaker sites you visit
- All data synced to your Vantedge account
- No third-party tracking or analytics
- Source code is fully transparent
