# Vantedge Browser Extension

Chrome/Edge extension for automatic bet tracking on Nigerian sportsbooks.

## Supported Bookmakers

- **Bet9ja** (bet9ja.com)
- **SportyBet** (sportybet.com)
- **BetKing** (betking.com)

## Features

- **Auto-sync bets**: Automatically captures placed bets
- **Bet history import**: Syncs historical bets from My Bets pages
- **Value opportunities**: Shows live value bets in popup
- **Quick stats**: View profit/loss at a glance

## Development Setup

### Prerequisites

- Node.js 18+
- Chrome or Edge browser

### Loading the Extension

1. Open Chrome/Edge and go to `chrome://extensions` or `edge://extensions`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this `extension` folder

### Testing

1. After loading, visit a supported bookmaker site
2. Place a bet or visit the bet history page
3. Open the extension popup to verify sync

## File Structure

```
extension/
├── manifest.json           # Extension manifest (v3)
├── background.js           # Service worker
├── content-scripts/
│   ├── bet9ja.js           # Bet9ja scraper
│   ├── sportybet.js        # SportyBet scraper
│   └── betking.js          # BetKing scraper
├── popup/
│   ├── popup.html          # Popup UI
│   └── popup.js            # Popup logic
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
