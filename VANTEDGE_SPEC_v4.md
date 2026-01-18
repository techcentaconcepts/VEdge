# Vantedge — Master Technical Specification
> **Version:** 4.0 (Consolidated)  
> **Last Updated:** January 18, 2026  
> **By:** Techcenta  
> **Tagline:** Trade the Market, Don't Gamble on the Game.

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Product Architecture](#2-product-architecture)
3. [Database Schema](#3-database-schema)
4. [Core Features](#4-core-features)
5. [Browser Extension](#5-browser-extension-vantedge-sync)
6. [Odds Scraper Service](#6-odds-scraper-service-naija-bridge)
7. [Telegram Bot](#7-telegram-bot)
8. [Security Architecture](#8-security-architecture)
9. [Payment & Billing](#9-payment--billing)
10. [Monitoring & Observability](#10-monitoring--observability)
11. [User Experience](#11-user-experience--onboarding)
12. [Monetization & Pricing](#12-monetization--pricing)
13. [Competitive Analysis](#13-competitive-analysis)
14. [Legal & Compliance](#14-legal--compliance)
15. [Risk Management](#15-risk-management)
16. [Testing Strategy](#16-testing-strategy)
17. [Development Roadmap](#17-development-roadmap)

---

## 1. Executive Summary

**Vantedge** is a high-performance betting analytics and infrastructure SaaS designed for professional "career" bettors. The platform solves two critical pain points:

1. **Finding a Mathematical Edge** — Detecting "Line-Lag" (price discrepancies) between global sharp markets (Pinnacle, Betfair) and local soft bookmakers (Bet9ja, SportyBet, Betking).

2. **Preventing Account Limitations** — Integrated stealth technology (via Techcenta infrastructure) to protect winning bettors from being "gubbed" (limited/banned).

### Target Markets
- **Primary:** Nigeria, Kenya, Ghana (African betting markets)
- **Secondary:** UK, EU (established sharp betting markets)

### Value Proposition
Unlike global competitors (OddsJam, RebelBetting), Vantedge offers:
- Local African bookmaker coverage (ignored by competitors)
- 5-10x lower pricing ($10-49/mo vs $100-200/mo)
- Integrated stealth infrastructure (not just data)
- Telegram-first delivery (optimized for African data plans)

---

## 2. Product Architecture

### 2.1 System Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                         VANTEDGE PLATFORM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Next.js    │    │   Telegram   │    │   Browser    │       │
│  │  Dashboard   │    │     Bot      │    │  Extension   │       │
│  │   (Vercel)   │    │  (Aiogram)   │    │ (Manifest V3)│       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         └───────────────────┼───────────────────┘                │
│                             │                                    │
│                    ┌────────▼────────┐                          │
│                    │    Supabase     │                          │
│                    │  (PostgreSQL +  │                          │
│                    │  Auth + Edge    │                          │
│                    │   Functions)    │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│         ┌───────────────────┼───────────────────┐               │
│         │                   │                   │                │
│  ┌──────▼───────┐    ┌──────▼───────┐    ┌──────▼───────┐       │
│  │   FastAPI    │    │   Techcenta  │    │   Payment    │       │
│  │   Scraper    │    │    Proxy     │    │   Gateway    │       │
│  │  (Railway)   │    │   Network    │    │(Stripe/Stack)│       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Technical Stack
| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| **Frontend** | Next.js 14+ (App Router) | Trading dashboard, PWA support |
| **Hosting** | Vercel | Edge deployment, automatic scaling |
| **Database** | Supabase (PostgreSQL 15) | Real-time data, Row-Level Security |
| **Auth** | Supabase Auth | Email/password, OAuth, JWT tokens |
| **Backend Logic** | Supabase Edge Functions | Serverless compute (Deno) |
| **Odds Scraper** | FastAPI + Playwright | Headless browser automation |
| **Scraper Hosting** | Railway.app | Python runtime with containers |
| **Bot Framework** | Aiogram 3.x | Async Telegram bot |
| **Proxy Network** | Techcenta Residential IPs | Anti-detection, IP rotation |
| **Payments** | Stripe + Paystack | International + Nigerian payments |
| **Error Tracking** | Sentry | Real-time error monitoring |
| **Analytics** | Vercel Analytics + PostHog | User behavior tracking |

### 2.3 API Architecture
```
Base URL: https://api.vantedge.io/v1

Endpoints:
├── /auth
│   ├── POST /signup          # Create account
│   ├── POST /login           # Get JWT token
│   └── POST /refresh         # Refresh token
│
├── /bets
│   ├── GET  /                # List user's bets
│   ├── POST /                # Create bet record
│   ├── POST /sync            # Bulk sync from extension
│   └── GET  /stats           # ROI, CLV, P&L summary
│
├── /opportunities
│   ├── GET  /live            # Real-time value bets
│   ├── GET  /history         # Historical edges
│   └── WS   /stream          # WebSocket for live updates
│
├── /bankroll
│   ├── GET  /                # Current balances
│   ├── POST /update          # Manual balance update
│   └── GET  /chart           # Historical balance chart
│
├── /alerts
│   ├── GET  /preferences     # User alert settings
│   ├── PUT  /preferences     # Update settings
│   └── POST /telegram/link   # Link Telegram account
│
└── /subscription
    ├── GET  /status          # Current plan
    ├── POST /checkout        # Create checkout session
    └── POST /webhook         # Payment webhook handler
```

### 2.4 WebSocket Events
```javascript
// Client connects to wss://api.vantedge.io/v1/opportunities/stream

// Server → Client Events:
{
  "event": "new_opportunity",
  "data": {
    "id": "uuid",
    "match": "Arsenal vs Chelsea",
    "market": "Over 2.5 Goals",
    "sharp_odds": 1.85,
    "soft_odds": 2.10,
    "edge_percent": 13.5,
    "bookmaker": "bet9ja",
    "expires_at": "2026-01-18T15:30:00Z"
  }
}

{
  "event": "opportunity_closed",
  "data": { "id": "uuid", "reason": "odds_moved" }
}

// Client → Server Events:
{ "event": "subscribe", "markets": ["football", "basketball"] }
{ "event": "unsubscribe", "markets": ["basketball"] }
```

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram
```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   profiles  │       │   bankrolls │       │    bets     │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │──┐    │ id (PK)     │   ┌───│ id (PK)     │
│ email       │  │    │ user_id(FK) │◄──┤   │ user_id(FK) │
│ full_name   │  │    │ bookmaker   │   │   │ bookmaker   │
│ tier        │  └───►│ currency    │   │   │ stake       │
│ telegram_id │       │ balance     │   │   │ odds        │
│ created_at  │       │ updated_at  │   │   │ outcome     │
└─────────────┘       └─────────────┘   │   │ clv         │
                                        │   │ created_at  │
┌─────────────┐       ┌─────────────┐   │   └─────────────┘
│   odds_     │       │   value_    │   │
│  snapshots  │       │opportunities│   │
├─────────────┤       ├─────────────┤   │
│ id (PK)     │       │ id (PK)     │◄──┘
│ match_id    │──────►│ match_id    │
│ bookmaker   │       │ sharp_odds  │
│ market      │       │ soft_odds   │
│ odds        │       │ edge_pct    │
│ scraped_at  │       │ status      │
└─────────────┘       └─────────────┘
```

### 3.2 Table Definitions

```sql
-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' 
    CHECK (subscription_tier IN ('free', 'starter', 'pro')),
  telegram_chat_id BIGINT UNIQUE,
  telegram_username TEXT,
  stripe_customer_id TEXT UNIQUE,
  paystack_customer_code TEXT UNIQUE,
  alert_preferences JSONB DEFAULT '{"min_edge": 5, "sports": ["football"], "enabled": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_tier ON profiles(subscription_tier);
CREATE INDEX idx_profiles_telegram ON profiles(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- ============================================
-- BANKROLLS TABLE
-- ============================================
CREATE TABLE bankrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bookmaker TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, bookmaker)
);

-- Indexes
CREATE INDEX idx_bankrolls_user ON bankrolls(user_id);

-- RLS Policies
ALTER TABLE bankrolls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bankrolls" 
  ON bankrolls FOR ALL 
  USING (auth.uid() = user_id);

-- ============================================
-- BETS TABLE
-- ============================================
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  external_bet_id TEXT, -- ID from bookmaker's system
  bookmaker TEXT NOT NULL,
  sport TEXT NOT NULL,
  league TEXT,
  match_name TEXT NOT NULL,
  market TEXT NOT NULL,
  selection TEXT NOT NULL,
  odds DECIMAL(6, 3) NOT NULL,
  stake DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  potential_return DECIMAL(12, 2) GENERATED ALWAYS AS (stake * odds) STORED,
  outcome TEXT CHECK (outcome IN ('pending', 'won', 'lost', 'void', 'cashout')),
  profit_loss DECIMAL(12, 2),
  closing_odds DECIMAL(6, 3), -- For CLV calculation
  clv_percent DECIMAL(5, 2), -- Closing Line Value
  placed_at TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ,
  synced_from TEXT CHECK (synced_from IN ('extension', 'manual', 'api')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, external_bet_id, bookmaker)
);

-- Indexes
CREATE INDEX idx_bets_user_date ON bets(user_id, placed_at DESC);
CREATE INDEX idx_bets_user_bookmaker ON bets(user_id, bookmaker);
CREATE INDEX idx_bets_outcome ON bets(outcome) WHERE outcome = 'pending';

-- RLS Policies
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bets" 
  ON bets FOR ALL 
  USING (auth.uid() = user_id);

-- ============================================
-- ODDS SNAPSHOTS TABLE
-- ============================================
CREATE TABLE odds_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL, -- External match identifier
  match_name TEXT NOT NULL,
  sport TEXT NOT NULL,
  league TEXT,
  kickoff_time TIMESTAMPTZ NOT NULL,
  bookmaker TEXT NOT NULL,
  market TEXT NOT NULL,
  selection TEXT NOT NULL,
  odds DECIMAL(6, 3) NOT NULL,
  is_sharp BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE for Pinnacle/Betfair
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (time-series optimized)
CREATE INDEX idx_odds_match_time ON odds_snapshots(match_id, scraped_at DESC);
CREATE INDEX idx_odds_bookmaker ON odds_snapshots(bookmaker, scraped_at DESC);
CREATE INDEX idx_odds_sharp ON odds_snapshots(is_sharp, scraped_at DESC) WHERE is_sharp = TRUE;

-- Partitioning (by month for performance)
-- Consider TimescaleDB extension for production

-- ============================================
-- VALUE OPPORTUNITIES TABLE
-- ============================================
CREATE TABLE value_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL,
  match_name TEXT NOT NULL,
  sport TEXT NOT NULL,
  league TEXT,
  kickoff_time TIMESTAMPTZ NOT NULL,
  market TEXT NOT NULL,
  selection TEXT NOT NULL,
  sharp_bookmaker TEXT NOT NULL,
  sharp_odds DECIMAL(6, 3) NOT NULL,
  soft_bookmaker TEXT NOT NULL,
  soft_odds DECIMAL(6, 3) NOT NULL,
  edge_percent DECIMAL(5, 2) NOT NULL,
  kelly_fraction DECIMAL(5, 4),
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'expired', 'odds_moved', 'won', 'lost')),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  expired_at TIMESTAMPTZ,
  bet_link TEXT -- Deep link to bookmaker bet slip
);

-- Indexes
CREATE INDEX idx_opportunities_active ON value_opportunities(status, detected_at DESC) 
  WHERE status = 'active';
CREATE INDEX idx_opportunities_edge ON value_opportunities(edge_percent DESC) 
  WHERE status = 'active';

-- ============================================
-- ALERT LOG TABLE
-- ============================================
CREATE TABLE alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES value_opportunities(id),
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'email', 'push')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'clicked')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

CREATE INDEX idx_alerts_user ON alert_log(user_id, sent_at DESC);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'pro')),
  payment_provider TEXT CHECK (payment_provider IN ('stripe', 'paystack')),
  external_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bankrolls_updated_at
  BEFORE UPDATE ON bankrolls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Calculate CLV when bet is settled
CREATE OR REPLACE FUNCTION calculate_clv()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.closing_odds IS NOT NULL AND NEW.odds IS NOT NULL THEN
    NEW.clv_percent = ((NEW.odds / NEW.closing_odds) - 1) * 100;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bets_calculate_clv
  BEFORE INSERT OR UPDATE ON bets
  FOR EACH ROW EXECUTE FUNCTION calculate_clv();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 4. Core Features

### 4.1 Value Scanner (Line-Lag Detection)

**Purpose:** Identify profitable betting opportunities where local soft bookmakers lag behind global sharp markets.

**How It Works:**
```
1. Scrape sharp odds (Pinnacle, Betfair) every 30 seconds
2. Scrape soft odds (Bet9ja, SportyBet) every 2 minutes
3. Compare odds for same match/market
4. If Soft Odds > Sharp Odds by threshold → VALUE DETECTED
5. Calculate edge percentage and Kelly stake
6. Push alert to qualifying users
```

**Edge Calculation:**
```
True Probability = 1 / Sharp Odds
Implied Probability = 1 / Soft Odds
Edge % = ((1 / Soft Implied) - True Probability) / True Probability × 100

Example:
- Sharp Odds (Pinnacle): 1.85 → True Prob = 54.05%
- Soft Odds (Bet9ja): 2.10 → Implied Prob = 47.62%
- Edge = (54.05% - 47.62%) / 47.62% = 13.5%
```

**Kelly Criterion Calculator:**
```
Kelly Fraction = (Edge × Probability) / Odds
Recommended Stake = Bankroll × Kelly Fraction × 0.25 (quarter Kelly for safety)
```

### 4.2 Bankroll Auditor (Free Tier Hook)

**Purpose:** Analyze user's betting history to calculate true performance metrics.

**Metrics Calculated:**
- **ROI (Return on Investment):** Total Profit / Total Staked
- **CLV (Closing Line Value):** Did user beat the closing odds?
- **Win Rate:** Percentage of bets won
- **Yield:** Average profit per bet
- **Variance Analysis:** Luck vs. skill assessment
- **Sharpe Ratio:** Risk-adjusted returns

**CLV Interpretation:**
- **Positive CLV:** User consistently beats closing lines → Skilled bettor
- **Negative CLV:** User consistently loses to closing lines → Likely losing long-term
- **Zero CLV:** Breaking even before the vig

### 4.3 Stealth Suite (Pro Tier)

**Components:**

1. **Residential Proxy Tunneling**
   - Route all bookmaker traffic through Techcenta residential IPs
   - Prevents IP-based sharp detection
   - Geographic targeting (Nigerian IPs for Bet9ja)

2. **Browser Fingerprint Masking**
   - Canvas fingerprint randomization
   - WebGL renderer spoofing
   - Audio context fingerprint randomization
   - Screen resolution randomization
   - Timezone matching to IP geolocation

3. **Behavioral Simulation**
   - Randomized click patterns
   - Human-like mouse movements
   - Variable typing speeds
   - Natural delays between actions

4. **Mug Bet Scheduler**
   - AI-driven "mug" bet identification
   - Places small, losing-probability bets
   - Masks professional betting patterns
   - Configurable frequency and stake limits

---

## 5. Browser Extension (Vantedge Sync)

### 5.1 Overview
Chrome/Edge/Kiwi extension that scrapes bet history from Nigerian bookmakers lacking export functionality.

### 5.2 Technical Specification

**Manifest V3 Configuration:**
```json
{
  "manifest_version": 3,
  "name": "Vantedge Sync",
  "version": "1.0.0",
  "description": "Sync your betting history to Vantedge",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://web.bet9ja.com/*",
    "https://www.sportybet.com/*",
    "https://www.betking.com/*",
    "https://1xbet.ng/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://web.bet9ja.com/Account/MyBets*"],
      "js": ["content-scripts/bet9ja.js"]
    },
    {
      "matches": ["https://www.sportybet.com/ng/my-bets*"],
      "js": ["content-scripts/sportybet.js"]
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

### 5.3 Data Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER EXTENSION                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Content    │    │   IndexedDB  │    │  Background  │   │
│  │   Script     │───►│   (Local)    │───►│   Worker     │   │
│  │  (Scraper)   │    │              │    │   (Sync)     │   │
│  └──────────────┘    └──────────────┘    └──────┬───────┘   │
│                                                  │           │
└──────────────────────────────────────────────────┼───────────┘
                                                   │
                                                   ▼
                                          ┌──────────────┐
                                          │   Supabase   │
                                          │   (Cloud)    │
                                          └──────────────┘
```

### 5.4 Content Script Logic (Bet9ja Example)
```javascript
// content-scripts/bet9ja.js

const SELECTORS = {
  betRow: '.bet-history-row',
  betId: '.bet-id',
  stake: '.stake-amount',
  odds: '.total-odds',
  status: '.bet-status',
  selections: '.selection-item',
  placedAt: '.bet-date'
};

async function scrapeBets() {
  const bets = [];
  const rows = document.querySelectorAll(SELECTORS.betRow);
  
  for (const row of rows) {
    const bet = {
      external_bet_id: row.querySelector(SELECTORS.betId)?.textContent?.trim(),
      bookmaker: 'bet9ja',
      stake: parseFloat(row.querySelector(SELECTORS.stake)?.textContent?.replace(/[₦,]/g, '')),
      odds: parseFloat(row.querySelector(SELECTORS.odds)?.textContent),
      outcome: mapStatus(row.querySelector(SELECTORS.status)?.textContent),
      placed_at: parseDate(row.querySelector(SELECTORS.placedAt)?.textContent),
      selections: parseSelections(row.querySelectorAll(SELECTORS.selections)),
      synced_from: 'extension'
    };
    
    if (isValidBet(bet)) {
      bets.push(bet);
    }
  }
  
  // Store locally first
  await chrome.storage.local.set({ pendingSync: bets });
  
  // Notify background worker
  chrome.runtime.sendMessage({ type: 'BETS_SCRAPED', count: bets.length });
  
  return bets;
}

function mapStatus(statusText) {
  const map = {
    'Won': 'won',
    'Lost': 'lost',
    'Pending': 'pending',
    'Void': 'void',
    'Cash Out': 'cashout'
  };
  return map[statusText] || 'pending';
}
```

### 5.5 Background Worker (Sync Logic)
```javascript
// background.js

import { createClient } from '@supabase/supabase-js';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 50;

let supabase = null;

async function initSupabase() {
  const { accessToken } = await chrome.storage.local.get('accessToken');
  if (accessToken) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });
  }
}

async function syncBets() {
  if (!supabase) return;
  
  const { pendingSync = [] } = await chrome.storage.local.get('pendingSync');
  if (pendingSync.length === 0) return;
  
  // Batch upload
  for (let i = 0; i < pendingSync.length; i += BATCH_SIZE) {
    const batch = pendingSync.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from('bets')
      .upsert(batch, { 
        onConflict: 'user_id,external_bet_id,bookmaker',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('Sync failed:', error);
      // Keep failed bets for retry
      return;
    }
  }
  
  // Clear synced bets
  await chrome.storage.local.set({ pendingSync: [] });
}

// Periodic sync
chrome.alarms.create('syncBets', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncBets') {
    syncBets();
  }
});
```

### 5.6 Supported Bookmakers
| Bookmaker | Region | Status | Notes |
|:----------|:-------|:-------|:------|
| Bet9ja | Nigeria | ✅ Supported | Primary target |
| SportyBet | Nigeria/Kenya | ✅ Supported | Multi-region |
| Betking | Nigeria | 🔄 In Progress | Reverse-engineering |
| 1xBet | Multi-region | 📋 Planned | Complex DOM structure |
| Betway | Africa | 📋 Planned | Has CSV export (lower priority) |

---

## 6. Odds Scraper Service (Naija Bridge)

### 6.1 Overview
FastAPI microservice running Playwright headless browsers to scrape odds from sharp and soft bookmakers.

### 6.2 Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    FASTAPI SCRAPER SERVICE                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   FastAPI    │    │  Playwright  │    │   Techcenta  │   │
│  │   Router     │───►│   Browser    │───►│    Proxy     │   │
│  │              │    │    Pool      │    │    Pool      │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────┐    ┌──────────────┐                       │
│  │   Celery     │    │    Redis     │                       │
│  │   Workers    │◄──►│   (Queue)    │                       │
│  └──────────────┘    └──────────────┘                       │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────┐                                           │
│  │   Supabase   │                                           │
│  │  (Storage)   │                                           │
│  └──────────────┘                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Technical Specification

**Dependencies:**
```
fastapi==0.109.0
uvicorn==0.27.0
playwright==1.41.0
celery==5.3.4
redis==5.0.1
supabase==2.3.0
httpx==0.26.0
pydantic==2.5.3
```

**Project Structure:**
```
naija-bridge/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app
│   ├── config.py            # Environment config
│   ├── models.py            # Pydantic schemas
│   ├── routers/
│   │   ├── odds.py          # Odds endpoints
│   │   └── health.py        # Health checks
│   ├── scrapers/
│   │   ├── base.py          # Abstract scraper
│   │   ├── pinnacle.py      # Sharp market
│   │   ├── betfair.py       # Sharp market
│   │   ├── bet9ja.py        # Soft market
│   │   └── sportybet.py     # Soft market
│   ├── services/
│   │   ├── browser_pool.py  # Playwright management
│   │   ├── proxy_rotator.py # Techcenta integration
│   │   └── edge_detector.py # Value opportunity logic
│   └── tasks/
│       └── scrape_tasks.py  # Celery tasks
├── tests/
├── Dockerfile
├── requirements.txt
└── railway.toml
```

### 6.4 Scraper Implementation
```python
# app/scrapers/base.py

from abc import ABC, abstractmethod
from playwright.async_api import Page, Browser
from app.models import OddsSnapshot
from typing import List

class BaseScraper(ABC):
    def __init__(self, browser: Browser, proxy: str = None):
        self.browser = browser
        self.proxy = proxy
        self.is_sharp = False
        
    @property
    @abstractmethod
    def bookmaker_name(self) -> str:
        pass
    
    @property
    @abstractmethod
    def base_url(self) -> str:
        pass
    
    @abstractmethod
    async def scrape_match(self, match_url: str) -> List[OddsSnapshot]:
        pass
    
    async def create_page(self) -> Page:
        context_options = {
            "viewport": {"width": 1920, "height": 1080},
            "user_agent": self._random_user_agent(),
        }
        if self.proxy:
            context_options["proxy"] = {"server": self.proxy}
        
        context = await self.browser.new_context(**context_options)
        page = await context.new_page()
        
        # Anti-detection
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        """)
        
        return page
    
    def _random_user_agent(self) -> str:
        agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...",
            # ... more agents
        ]
        return random.choice(agents)


# app/scrapers/pinnacle.py

class PinnacleScraper(BaseScraper):
    bookmaker_name = "pinnacle"
    base_url = "https://www.pinnacle.com"
    is_sharp = True
    
    async def scrape_match(self, match_url: str) -> List[OddsSnapshot]:
        page = await self.create_page()
        snapshots = []
        
        try:
            await page.goto(match_url, wait_until="networkidle")
            
            # Wait for odds to load
            await page.wait_for_selector(".market-odds", timeout=10000)
            
            # Extract match info
            match_name = await page.locator(".event-header").text_content()
            kickoff = await self._parse_kickoff(page)
            
            # Extract all markets
            markets = await page.locator(".market-group").all()
            
            for market in markets:
                market_name = await market.locator(".market-name").text_content()
                selections = await market.locator(".selection").all()
                
                for selection in selections:
                    selection_name = await selection.locator(".selection-name").text_content()
                    odds = await selection.locator(".odds-value").text_content()
                    
                    snapshots.append(OddsSnapshot(
                        match_id=self._generate_match_id(match_name, kickoff),
                        match_name=match_name,
                        sport="football",
                        kickoff_time=kickoff,
                        bookmaker=self.bookmaker_name,
                        market=market_name,
                        selection=selection_name,
                        odds=float(odds),
                        is_sharp=self.is_sharp
                    ))
        
        finally:
            await page.close()
        
        return snapshots
```

### 6.5 Edge Detection Service
```python
# app/services/edge_detector.py

from decimal import Decimal
from typing import Optional
from app.models import ValueOpportunity, OddsSnapshot
from supabase import Client

class EdgeDetector:
    def __init__(self, supabase: Client, min_edge: float = 2.0):
        self.supabase = supabase
        self.min_edge = min_edge
    
    async def detect_opportunities(self, match_id: str) -> list[ValueOpportunity]:
        opportunities = []
        
        # Get latest sharp odds
        sharp_odds = await self._get_latest_odds(match_id, is_sharp=True)
        
        # Get latest soft odds
        soft_odds = await self._get_latest_odds(match_id, is_sharp=False)
        
        # Compare each market
        for market, sharp_data in sharp_odds.items():
            if market not in soft_odds:
                continue
            
            soft_data = soft_odds[market]
            
            for selection, sharp_odd in sharp_data.items():
                if selection not in soft_data:
                    continue
                
                soft_odd = soft_data[selection]
                edge = self._calculate_edge(sharp_odd, soft_odd)
                
                if edge >= self.min_edge:
                    opportunities.append(ValueOpportunity(
                        match_id=match_id,
                        market=market,
                        selection=selection,
                        sharp_bookmaker="pinnacle",
                        sharp_odds=sharp_odd,
                        soft_bookmaker=soft_data.get("bookmaker", "bet9ja"),
                        soft_odds=soft_odd,
                        edge_percent=edge,
                        kelly_fraction=self._kelly_criterion(sharp_odd, soft_odd),
                        status="active"
                    ))
        
        return opportunities
    
    def _calculate_edge(self, sharp_odds: float, soft_odds: float) -> float:
        """Calculate edge percentage."""
        true_prob = 1 / sharp_odds
        implied_prob = 1 / soft_odds
        edge = ((true_prob - implied_prob) / implied_prob) * 100
        return round(edge, 2)
    
    def _kelly_criterion(self, sharp_odds: float, soft_odds: float) -> float:
        """Calculate Kelly fraction for optimal stake sizing."""
        true_prob = 1 / sharp_odds
        edge = (soft_odds * true_prob - 1) / (soft_odds - 1)
        return max(0, round(edge, 4))
```

### 6.6 Scraping Schedule
| Bookmaker | Type | Interval | Priority |
|:----------|:-----|:---------|:---------|
| Pinnacle | Sharp | 30 seconds | High |
| Betfair | Sharp | 30 seconds | High |
| Bet9ja | Soft | 2 minutes | High |
| SportyBet | Soft | 2 minutes | High |
| Betking | Soft | 2 minutes | Medium |
| 1xBet | Soft | 5 minutes | Low |

### 6.7 Anti-Detection Measures
1. **IP Rotation:** Rotate through Techcenta residential proxy pool
2. **User-Agent Rotation:** Random UA from pool of 50+ real browsers
3. **Request Timing:** Random delays (2-5 seconds between requests)
4. **Session Persistence:** Maintain cookies to appear as returning user
5. **Fingerprint Spoofing:** Canvas, WebGL, and audio context randomization
6. **Rate Limiting:** Max 10 requests/minute per bookmaker

---

## 7. Telegram Bot

### 7.1 Overview
Aiogram 3.x-based bot for delivering real-time value alerts and quick portfolio stats.

### 7.2 Command Structure
```
/start          - Onboard user, link Supabase account
/link <email>   - Link existing Vantedge account
/alerts on|off  - Toggle push notifications
/settings       - Configure alert preferences
/roi            - Quick P&L summary
/clv            - Closing Line Value stats
/bankroll       - Current balances
/edge [sport]   - Get current value opportunities
/help           - Show command list
```

### 7.3 Alert Format
```
⚡ VALUE DETECTED

📊 Match: Arsenal vs Chelsea
🏆 League: Premier League
🎯 Market: Over 2.5 Goals
📈 Sharp Odds: 1.85 (Pinnacle)
💰 Soft Odds: 2.10 (Bet9ja)
🔥 Edge: +13.5%

💸 Recommended Stake:
├── Full Kelly: ₦12,500
├── Half Kelly: ₦6,250
└── Quarter Kelly: ₦3,125

⏰ Kickoff: 3:00 PM WAT

[🎯 Place Bet on Bet9ja](https://bet9ja.com/sport/...)

---
⚙️ /settings to customize alerts
```

### 7.4 Implementation
```python
# bot/main.py

import asyncio
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from supabase import create_client, Client
import os

bot = Bot(token=os.environ["TELEGRAM_BOT_TOKEN"])
dp = Dispatcher()
supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"]
)

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    """Onboard new user."""
    telegram_id = message.from_user.id
    username = message.from_user.username
    
    # Check if already linked
    result = supabase.table("profiles").select("*").eq(
        "telegram_chat_id", telegram_id
    ).execute()
    
    if result.data:
        await message.answer(
            f"✅ Welcome back! Your account is already linked.\n\n"
            f"Use /help to see available commands."
        )
        return
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🔗 Link Account",
            url=f"https://app.vantedge.io/link-telegram?id={telegram_id}"
        )],
        [InlineKeyboardButton(
            text="📝 Create Account",
            url="https://app.vantedge.io/signup"
        )]
    ])
    
    await message.answer(
        f"👋 Welcome to Vantedge!\n\n"
        f"Trade the market, don't gamble on the game.\n\n"
        f"To receive value alerts, please link or create your account:",
        reply_markup=keyboard
    )

@dp.message(Command("roi"))
async def cmd_roi(message: types.Message):
    """Show ROI summary."""
    user = await get_user_by_telegram(message.from_user.id)
    if not user:
        await message.answer("❌ Please /link your account first.")
        return
    
    # Fetch stats from Supabase
    stats = supabase.rpc("calculate_user_stats", {"user_id": user["id"]}).execute()
    
    if not stats.data:
        await message.answer("📊 No betting data found. Sync your bets first!")
        return
    
    s = stats.data
    await message.answer(
        f"📊 **Your Performance**\n\n"
        f"💰 Total Staked: ₦{s['total_staked']:,.0f}\n"
        f"📈 Total Profit: ₦{s['total_profit']:,.0f}\n"
        f"📊 ROI: {s['roi']:.1f}%\n"
        f"🎯 Win Rate: {s['win_rate']:.1f}%\n"
        f"📉 CLV: {s['avg_clv']:+.2f}%\n"
        f"🎰 Total Bets: {s['total_bets']}\n\n"
        f"_Last updated: {s['last_updated']}_",
        parse_mode="Markdown"
    )

@dp.message(Command("edge"))
async def cmd_edge(message: types.Message):
    """Show current value opportunities."""
    user = await get_user_by_telegram(message.from_user.id)
    if not user:
        await message.answer("❌ Please /link your account first.")
        return
    
    # Check subscription tier
    if user["subscription_tier"] == "free":
        await message.answer(
            "🔒 Real-time alerts require a Starter subscription.\n\n"
            "Upgrade at https://app.vantedge.io/upgrade"
        )
        return
    
    # Fetch active opportunities
    result = supabase.table("value_opportunities").select("*").eq(
        "status", "active"
    ).gte("edge_percent", user["alert_preferences"]["min_edge"]).order(
        "edge_percent", desc=True
    ).limit(5).execute()
    
    if not result.data:
        await message.answer("😴 No value opportunities detected right now.\n\nCheck back soon!")
        return
    
    for opp in result.data:
        await send_opportunity_alert(message.chat.id, opp)

async def send_opportunity_alert(chat_id: int, opp: dict):
    """Send formatted value opportunity alert."""
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text=f"🎯 Bet on {opp['soft_bookmaker'].title()}",
            url=opp.get("bet_link", "#")
        )]
    ])
    
    await bot.send_message(
        chat_id,
        f"⚡ **VALUE DETECTED**\n\n"
        f"📊 Match: {opp['match_name']}\n"
        f"🎯 Market: {opp['market']}\n"
        f"📈 Sharp: {opp['sharp_odds']:.2f} ({opp['sharp_bookmaker'].title()})\n"
        f"💰 Soft: {opp['soft_odds']:.2f} ({opp['soft_bookmaker'].title()})\n"
        f"🔥 Edge: **+{opp['edge_percent']:.1f}%**\n\n"
        f"💸 Kelly: {opp['kelly_fraction']*100:.1f}% of bankroll",
        reply_markup=keyboard,
        parse_mode="Markdown"
    )

async def get_user_by_telegram(telegram_id: int) -> dict | None:
    """Fetch user profile by Telegram ID."""
    result = supabase.table("profiles").select("*").eq(
        "telegram_chat_id", telegram_id
    ).single().execute()
    return result.data

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
```

### 7.5 Alert Delivery Logic
| Tier | Edge Threshold | Delay | Daily Limit |
|:-----|:---------------|:------|:------------|
| Free | N/A | N/A | 0 (No alerts) |
| Starter | ≥5% | Real-time | 50 |
| Pro | ≥2% | Real-time | Unlimited |

---

## 8. Security Architecture

### 8.1 Authentication Flow
```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │────►│ Next.js │────►│Supabase │────►│   JWT   │
│         │     │   App   │     │  Auth   │     │  Token  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
              ┌─────────┐      ┌─────────┐      ┌─────────┐
              │ Access  │      │ Refresh │      │ Session │
              │ Token   │      │ Token   │      │ Cookie  │
              │ (15min) │      │ (7 day) │      │(Secure) │
              └─────────┘      └─────────┘      └─────────┘
```

### 8.2 Token Management
- **Access Token:** 15-minute expiry, stored in memory
- **Refresh Token:** 7-day expiry, HTTP-only secure cookie
- **Auto-refresh:** Client SDK handles token refresh transparently
- **Revocation:** All tokens invalidated on password change

### 8.3 Data Protection
| Data Type | At Rest | In Transit | Notes |
|:----------|:--------|:-----------|:------|
| User Credentials | bcrypt hash | TLS 1.3 | Never stored plaintext |
| Bet History | AES-256 (Supabase) | TLS 1.3 | User-owned data |
| API Keys | Encrypted vault | TLS 1.3 | Environment variables |
| Session Tokens | Memory only | TLS 1.3 | Not persisted |

### 8.4 Row-Level Security (RLS)
All database tables have RLS policies ensuring users can only access their own data:
```sql
-- Example: Users can only see their own bets
CREATE POLICY "Users see own bets" ON bets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own bets" ON bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 8.5 Rate Limiting
| Endpoint | Free | Starter | Pro |
|:---------|:-----|:--------|:----|
| `/api/*` | 100/hour | 1,000/hour | 10,000/hour |
| `/api/opportunities` | 10/hour | 100/hour | Unlimited |
| WebSocket connections | 1 | 3 | 10 |
| Extension sync | 10/day | 50/day | Unlimited |

### 8.6 Security Headers
```javascript
// next.config.js
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'..." }
];
```

### 8.7 Two-Factor Authentication (Pro Tier)
- Optional TOTP-based 2FA via authenticator apps
- Backup codes for account recovery
- Required for sensitive actions (password change, subscription cancellation)

---

## 9. Payment & Billing

### 9.1 Payment Providers
| Provider | Region | Methods | Use Case |
|:---------|:-------|:--------|:---------|
| **Stripe** | International | Card, Apple Pay, Google Pay | UK/EU/US users |
| **Paystack** | Nigeria | Card, Bank Transfer, USSD | Nigerian users |

### 9.2 Pricing Matrix
| Tier | USD Price | NGN Price | Features |
|:-----|:----------|:----------|:---------|
| **Explorer** | Free | Free | Bet tracking, basic stats, 5-min delayed odds |
| **Starter** | $10/mo | ₦15,000/mo | Real-time alerts, Telegram bot, full stats |
| **Pro** | $49/mo | ₦75,000/mo | Stealth Suite, unlimited alerts, priority support |

### 9.3 Subscription Flow
```
User clicks "Upgrade"
        │
        ▼
Detect user region (IP geolocation)
        │
        ├──► Nigeria/Africa → Paystack Checkout
        │
        └──► Other → Stripe Checkout
        
        │
        ▼
Payment successful → Webhook received
        │
        ▼
Update `subscriptions` table
        │
        ▼
Update `profiles.subscription_tier`
        │
        ▼
Send confirmation email + Telegram
```

### 9.4 Webhook Handling
```typescript
// app/api/webhooks/stripe/route.ts

import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCancel(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
  }
  
  return new Response('OK', { status: 200 });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const tier = session.metadata?.tier;
  
  await supabase.from('subscriptions').upsert({
    user_id: userId,
    tier: tier,
    payment_provider: 'stripe',
    external_subscription_id: session.subscription,
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });
  
  await supabase.from('profiles').update({
    subscription_tier: tier,
    stripe_customer_id: session.customer
  }).eq('id', userId);
}
```

### 9.5 Grace Period & Dunning
- **Failed Payment:** 3-day grace period before downgrade
- **Dunning Emails:** Day 1, Day 3 reminders
- **Downgrade:** Auto-downgrade to Free after grace period
- **Data Retention:** Betting history preserved for 90 days after downgrade

---

## 10. Monitoring & Observability

### 10.1 Monitoring Stack
```
┌─────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Sentry     │    │   Vercel     │    │   PostHog    │   │
│  │   (Errors)   │    │  Analytics   │    │  (Product)   │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Supabase   │    │   LogTail    │    │  PagerDuty   │   │
│  │   Logs       │    │ (Aggregator) │    │  (Alerting)  │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Key Metrics
**Business Metrics:**
- Daily/Weekly/Monthly Active Users (DAU/WAU/MAU)
- Signup → Extension Install conversion rate
- Free → Paid conversion rate
- Churn rate by tier
- Monthly Recurring Revenue (MRR)
- Average Revenue Per User (ARPU)
- Alert click-through rate

**Technical Metrics:**
- API response times (p50, p95, p99)
- Error rate by endpoint
- Scraper uptime per bookmaker
- Database connection pool utilization
- WebSocket connection count
- Extension sync success rate

### 10.3 Alerting Rules
| Metric | Warning | Critical | Channel |
|:-------|:--------|:---------|:--------|
| API Error Rate | >1% | >5% | Slack + PagerDuty |
| Scraper Downtime | >5 min | >15 min | PagerDuty |
| DB Connections | >70% | >90% | Slack |
| Failed Payments | >5/day | >20/day | Email |
| Signup Spike | >200% baseline | >500% | Slack |

### 10.4 Logging Strategy
```typescript
// Structured logging format
{
  "timestamp": "2026-01-18T12:34:56.789Z",
  "level": "info",
  "service": "api",
  "event": "opportunity_detected",
  "data": {
    "match_id": "arsenal-chelsea-20260118",
    "edge_percent": 13.5,
    "soft_bookmaker": "bet9ja"
  },
  "user_id": null, // Never log PII
  "request_id": "req_abc123"
}
```

### 10.5 Dashboard (Grafana/PostHog)
```
┌────────────────────────────────────────────────────────┐
│                 VANTEDGE DASHBOARD                      │
├────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │    MRR      │  │    DAU      │  │  Error Rate │     │
│  │   $2,450    │  │    342      │  │    0.3%     │     │
│  │   ↑ 12%     │  │   ↑ 8%      │  │   ↓ 0.1%   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Active Opportunities (Last 24h)          │   │
│  │  ▓▓▓▓▓▓▓▓░░░░░░ 58% Football                    │   │
│  │  ▓▓▓▓░░░░░░░░░░ 28% Basketball                  │   │
│  │  ▓▓░░░░░░░░░░░░ 14% Tennis                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              API Response Times                   │   │
│  │  p50: 45ms | p95: 120ms | p99: 350ms            │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

---

## 11. User Experience & Onboarding

### 11.1 Onboarding Flow
```
Step 1: Sign Up
├── Email/password OR Google OAuth
├── Select region (Nigeria/UK/Other)
└── Agree to Terms of Service

Step 2: Install Extension
├── Detect browser (Chrome/Edge/Kiwi)
├── Redirect to appropriate store
└── Confirm installation

Step 3: First Sync
├── Navigate to bookmaker "My Bets" page
├── Extension auto-scrapes history
└── Redirect to dashboard with data

Step 4: View Audit Report
├── Show ROI, CLV, Win Rate
├── Highlight areas for improvement
└── Upsell to Starter tier for alerts
```

### 11.2 Interface Distribution
| Channel | Primary Use Case | Target Users |
|:--------|:-----------------|:-------------|
| **Web Dashboard** | Deep analytics, settings | All users |
| **Telegram Bot** | Quick alerts, stats | Mobile-first users |
| **Browser Extension** | Data sync | All users |
| **PWA** | Mobile dashboard | Power users |

### 11.3 Dashboard Wireframe
```
┌────────────────────────────────────────────────────────┐
│  VANTEDGE                    [Settings] [Logout]       │
├────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │ Bankroll│ │   ROI   │ │   CLV   │ │Win Rate │      │
│  │₦125,000 │ │ +12.5%  │ │ +2.3%   │ │  54.2%  │      │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
│                                                        │
│  📊 VALUE OPPORTUNITIES                    [🔔 Alerts] │
│  ┌────────────────────────────────────────────────┐   │
│  │ Arsenal vs Chelsea | Over 2.5 | +13.5% Edge   │→  │
│  │ Man City vs Liverpool | BTTS | +8.2% Edge     │→  │
│  │ Barcelona vs Madrid | 1X | +6.1% Edge         │→  │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  📈 PERFORMANCE CHART                    [30D ▼]      │
│  ┌────────────────────────────────────────────────┐   │
│  │     ╱╲    ╱╲                                   │   │
│  │    ╱  ╲  ╱  ╲    ╱╲                           │   │
│  │   ╱    ╲╱    ╲  ╱  ╲                          │   │
│  │  ╱            ╲╱    ╲   ╱                     │   │
│  │ ╱                    ╲ ╱                       │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  📋 RECENT BETS                         [View All →]  │
│  ┌────────────────────────────────────────────────┐   │
│  │ ✅ Arsenal Win | 2.10 | ₦5,000 | +₦5,500      │   │
│  │ ❌ BTTS Yes | 1.85 | ₦3,000 | -₦3,000         │   │
│  │ ⏳ Over 2.5 | 1.95 | ₦4,000 | Pending         │   │
│  └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

---

## 12. Monetization & Pricing

### 12.1 Pricing Philosophy
- **Aggressive underpricing** vs. global competitors (OddsJam at $100+/mo)
- **Local currency pricing** for African markets (no FX friction)
- **Freemium hook** with valuable free tier to drive adoption

### 12.2 Tier Comparison
| Feature | Explorer (Free) | Starter ($10) | Pro ($49) |
|:--------|:----------------|:--------------|:----------|
| Bet Tracking | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| Extension Sync | ✅ 10/day | ✅ 50/day | ✅ Unlimited |
| ROI/CLV Stats | ✅ Basic | ✅ Full | ✅ Full + Export |
| Value Scanner | ❌ | ✅ 5%+ edges | ✅ 2%+ edges |
| Alert Delay | 5 minutes | Real-time | Real-time |
| Telegram Alerts | ❌ | ✅ 50/day | ✅ Unlimited |
| WebSocket Stream | ❌ | ✅ 3 connections | ✅ 10 connections |
| Stealth Suite | ❌ | ❌ | ✅ Full access |
| Proxy IPs | ❌ | ❌ | ✅ 10 dedicated |
| Support | Community | Email | Priority + Call |

### 12.3 Revenue Projections
| Month | Free Users | Starter | Pro | MRR |
|:------|:-----------|:--------|:----|:----|
| M1 | 100 | 10 | 2 | $198 |
| M3 | 500 | 50 | 10 | $990 |
| M6 | 2,000 | 200 | 50 | $4,450 |
| M12 | 10,000 | 1,000 | 250 | $22,250 |

### 12.4 Upsell Triggers
1. **Free → Starter:** After first value opportunity detected but not shown
2. **Starter → Pro:** After 3rd account restriction reported by user
3. **Churn Prevention:** Offer 50% discount on annual plan before cancellation

---

## 13. Competitive Analysis

### 13.1 Market Landscape
| Competitor | Price | African Coverage | Stealth Tools | Telegram |
|:-----------|:------|:-----------------|:--------------|:---------|
| **OddsJam** | $99-199/mo | ❌ None | ❌ | ❌ |
| **RebelBetting** | $99/mo | ❌ None | ❌ | ❌ |
| **BetBurger** | $50-150/mo | ⚠️ Limited | ❌ | ⚠️ Basic |
| **Vantedge** | **$10-49/mo** | **✅ Primary** | **✅ Full** | **✅ Native** |

### 13.2 Competitive Moats
1. **Local Market Knowledge:** First-mover in Nigerian/African betting analytics
2. **Integrated Infrastructure:** Not just data, but stealth tools to use it
3. **Mobile-First Design:** Telegram delivery optimized for African data costs
4. **Price Leadership:** 5-10x cheaper than global alternatives
5. **Extension Technology:** Solves unique "no CSV export" problem in Africa

### 13.3 Risks from Competitors
- **OddsJam Africa Expansion:** Mitigate with entrenched local partnerships
- **Bookmaker Countermeasures:** Continuous cat-and-mouse with stealth tech
- **Local Copycats:** Speed to market and brand building

---

## 14. Legal & Compliance

### 14.1 Corporate Structure
- **Recommended Jurisdiction:** UK (strong SaaS legal framework) or Estonia (e-Residency)
- **Operating Entity:** Techcenta Ltd (or equivalent)
- **Data Processing:** EU-based for GDPR; consider Nigerian subsidiary for NDPA

### 14.2 Regulatory Classification
**Vantedge is classified as:**
- ✅ Software-as-a-Service (SaaS) data provider
- ✅ Informational/educational tool
- ❌ NOT a gambling operator (no bets placed on platform)
- ❌ NOT a tipster service (no specific bet recommendations)

### 14.3 Compliance Requirements
| Regulation | Jurisdiction | Requirements | Status |
|:-----------|:-------------|:-------------|:-------|
| **GDPR** | EU/UK | Data protection, right to erasure | 📋 Required |
| **NDPA** | Nigeria | Data protection, local processing | 📋 Required |
| **AML/KYC** | N/A | Not applicable (no funds handled) | ✅ Exempt |
| **Gambling License** | N/A | Not applicable (no wagering) | ✅ Exempt |

### 14.4 User Agreement Key Clauses
```
1. NATURE OF SERVICE
Vantedge provides statistical analysis and data visualization tools.
We do not place bets, recommend specific wagers, or guarantee profits.

2. ASSUMPTION OF RISK
Users acknowledge that:
- Sports betting carries significant financial risk
- Account restrictions by bookmakers are possible
- Past performance does not indicate future results
- Vantedge is not liable for financial losses

3. TERMS OF SERVICE VIOLATIONS
Users acknowledge that using scraped data may violate bookmaker terms.
Vantedge is not liable for account restrictions resulting from tool usage.

4. DATA USAGE
- Bet history is user-owned and can be deleted on request
- Anonymized data may be used for product improvement
- No data is sold to third parties

5. INDEMNIFICATION
Users agree to indemnify Vantedge against claims arising from
their use of the service or violations of bookmaker terms.
```

### 14.5 Privacy Policy Requirements
- Clear data collection disclosure
- Cookie consent mechanism
- Right to data export (GDPR Article 20)
- Right to erasure (GDPR Article 17)
- Data breach notification procedures

---

## 15. Risk Management

### 15.1 Risk Matrix
| Risk | Likelihood | Impact | Mitigation |
|:-----|:-----------|:-------|:-----------|
| Bookmaker API changes | High | High | Multi-source scraping, rapid adaptation |
| Mass user account bans | Medium | High | Stealth Suite, ban rate monitoring |
| Legal action from bookmakers | Low | Critical | SaaS classification, legal review |
| Competitor entry | Medium | Medium | Speed, local focus, pricing |
| Supabase outage | Low | High | Multi-region backup, local caching |
| Payment fraud | Medium | Medium | Stripe Radar, verification |

### 15.2 Technical Risk Mitigation
1. **Scraper Resilience:**
   - Multiple scraping strategies per bookmaker
   - Fallback to API where available
   - Manual data entry as last resort

2. **Data Integrity:**
   - Database backups every 6 hours
   - Point-in-time recovery capability
   - Audit logs for all data changes

3. **Service Availability:**
   - 99.9% SLA target
   - Geographic redundancy (Vercel edge)
   - Graceful degradation (cached data on outage)

### 15.3 User Communication
- **Transparency:** Clear communication about service limitations
- **Incident Response:** Status page at status.vantedge.io
- **Support Channels:** In-app chat, Telegram, email

---

## 16. Testing Strategy

### 16.1 Testing Pyramid
```
            ┌───────────┐
            │   E2E     │  10%
            │ (Playwright)│
           ┌┴───────────┴┐
           │ Integration │  30%
           │  (Vitest)   │
          ┌┴─────────────┴┐
          │    Unit       │  60%
          │  (Vitest)     │
          └───────────────┘
```

### 16.2 Test Coverage Targets
| Component | Coverage Target | Framework |
|:----------|:----------------|:----------|
| Next.js Frontend | >70% | Vitest + React Testing Library |
| Supabase Edge Functions | >80% | Deno Test |
| FastAPI Scraper | >80% | Pytest |
| Browser Extension | >60% | Jest + Puppeteer |
| Telegram Bot | >70% | Pytest + pytest-aiogram |

### 16.3 Test Types
**Unit Tests:**
```typescript
// Example: Edge calculation test
import { calculateEdge } from '@/lib/edge';

describe('calculateEdge', () => {
  it('calculates positive edge correctly', () => {
    const edge = calculateEdge(1.85, 2.10); // Sharp, Soft
    expect(edge).toBeCloseTo(13.5, 1);
  });
  
  it('returns zero for equal odds', () => {
    const edge = calculateEdge(2.00, 2.00);
    expect(edge).toBe(0);
  });
  
  it('returns negative for unfavorable odds', () => {
    const edge = calculateEdge(2.10, 1.85);
    expect(edge).toBeLessThan(0);
  });
});
```

**Integration Tests:**
```python
# Example: Scraper integration test
import pytest
from app.scrapers.pinnacle import PinnacleScraper

@pytest.mark.asyncio
async def test_pinnacle_scraper_returns_odds():
    scraper = PinnacleScraper(browser=mock_browser)
    odds = await scraper.scrape_match("https://pinnacle.com/football/match/123")
    
    assert len(odds) > 0
    assert all(o.bookmaker == "pinnacle" for o in odds)
    assert all(o.odds > 1.0 for o in odds)
```

**E2E Tests:**
```typescript
// Example: User signup to first sync
import { test, expect } from '@playwright/test';

test('new user can signup and sync bets', async ({ page }) => {
  // Signup
  await page.goto('/signup');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'SecurePass123!');
  await page.click('button[type="submit"]');
  
  // Verify redirect to onboarding
  await expect(page).toHaveURL('/onboarding');
  
  // Install extension prompt
  await expect(page.locator('text=Install Extension')).toBeVisible();
});
```

### 16.4 Load Testing
- **Tool:** k6.io
- **Scenarios:**
  - 1,000 concurrent dashboard users
  - 500 concurrent WebSocket connections
  - 100 concurrent extension syncs
- **Targets:**
  - p95 response time <500ms
  - Zero errors under normal load
  - <5% error rate under 2x peak load

---

## 17. Development Roadmap

### 17.1 Phase 0: Foundation (Weeks 1-2)
**Objective:** Infrastructure setup and development environment

**Deliverables:**
- [ ] Supabase project with schema deployed
- [ ] Next.js project with Tailwind + shadcn/ui
- [ ] GitHub repository with CI/CD (GitHub Actions)
- [ ] Vercel deployment pipeline
- [ ] Sentry error tracking
- [ ] Development environment documentation

**Team:** 1 Full-Stack Developer  
**Cost:** $0 (free tiers)

---

### 17.2 Phase 1: MVP - Bankroll Auditor (Weeks 3-6)
**Objective:** Launch free tier to validate user interest

**Deliverables:**
- [ ] User authentication (email + Google OAuth)
- [ ] Browser extension (Bet9ja scraper only)
- [ ] Basic dashboard with P&L chart
- [ ] ROI and CLV calculation
- [ ] Extension sync to Supabase
- [ ] Landing page + marketing site

**Success Metrics:**
- 100 beta signups
- 50 extension installs
- 70% week-1 retention

**Team:** 1 Full-Stack + 1 Designer  
**Cost:** ~$500 (design tools, domains)

---

### 17.3 Phase 2: Value Scanner (Weeks 7-12)
**Objective:** Launch paid Starter tier with real-time alerts

**Deliverables:**
- [ ] FastAPI scraper service (Pinnacle + Bet9ja)
- [ ] Edge detection algorithm
- [ ] Telegram bot with alerts
- [ ] WebSocket stream for dashboard
- [ ] Stripe + Paystack integration
- [ ] Subscription management

**Success Metrics:**
- 500 total users
- 50 paying subscribers
- $500 MRR
- <30 second alert latency

**Team:** 1 Full-Stack + 1 Python Backend  
**Cost:** ~$300/month (Railway, proxies)

---

### 17.4 Phase 3: Stealth Suite (Weeks 13-18)
**Objective:** Launch Pro tier with Techcenta integration

**Deliverables:**
- [ ] Techcenta proxy API integration
- [ ] Browser fingerprint masking
- [ ] Mug bet scheduler algorithm
- [ ] Additional bookmaker support (SportyBet, Betking)
- [ ] Advanced analytics (Sharpe ratio, drawdown)
- [ ] Mobile PWA optimization

**Success Metrics:**
- 1,000 total users
- 100 Pro subscribers
- $5,000 MRR
- <5% reported account restriction rate

**Team:** 2 Full-Stack + 1 Security Engineer  
**Cost:** ~$1,500/month (infrastructure)

---

### 17.5 Phase 4: Scale & Expansion (Months 5-6)
**Objective:** Expand market coverage and prepare for growth

**Deliverables:**
- [ ] UK/EU bookmaker coverage
- [ ] React Native mobile app
- [ ] Affiliate program
- [ ] API access for enterprise users
- [ ] Series A preparation materials

**Success Metrics:**
- 5,000 total users
- $25,000 MRR
- Positive unit economics
- Series A term sheet

**Team:** 3 Full-Stack + 1 Mobile + 1 Marketing  
**Cost:** ~$5,000/month (team + infrastructure)

---

### 17.6 Milestone Timeline
```
2026
Jan       Feb       Mar       Apr       May       Jun
|---------|---------|---------|---------|---------|
  Phase 0   Phase 1       Phase 2           Phase 3
  ████████  ████████████  ████████████████  ████████████████
  Setup     MVP Launch    Starter Tier      Pro Tier
                          Telegram Bot      Stealth Suite
                          Payments          Scale
```

---

## Appendix A: Glossary

| Term | Definition |
|:-----|:-----------|
| **CLV** | Closing Line Value - comparing your bet odds to the final odds before kickoff |
| **Edge** | Mathematical advantage over the bookmaker |
| **Gubbing** | When a bookmaker limits or bans a winning account |
| **Kelly Criterion** | Formula for optimal bet sizing based on edge |
| **Line-Lag** | Delay between sharp market movement and soft market adjustment |
| **Mug Bet** | Low-value bet placed to appear as a casual bettor |
| **RLS** | Row-Level Security - database access control |
| **Sharp** | Professional bettor or bookmaker with accurate odds |
| **Soft** | Recreational-focused bookmaker with less accurate odds |
| **Steam Move** | Large money movement on sharp markets |
| **Vig/Juice** | Bookmaker's commission built into the odds |

---

## Appendix B: Contact & Support

- **Technical Support:** support@vantedge.io
- **Business Inquiries:** hello@techcenta.com
- **Security Issues:** security@vantedge.io
- **Documentation:** docs.vantedge.io
- **Status Page:** status.vantedge.io

---

*Document Version: 4.0*  
*Last Updated: January 18, 2026*  
*Next Review: February 18, 2026*
