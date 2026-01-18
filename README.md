# Vantedge - Betting Analytics Platform

<p align="center">
  <img src="public/logo.svg" alt="Vantedge Logo" width="120" />
</p>

<p align="center">
  <strong>Find the edge. Beat the bookies.</strong>
</p>

<p align="center">
  Track bets, discover value opportunities, and optimize your betting strategy with professional-grade analytics.
</p>

---

## 🎯 Overview

Vantedge is a betting analytics SaaS designed primarily for the Nigerian market, helping bettors:

- **Track all bets** automatically via browser extension
- **Find value opportunities** through line-lag detection (soft vs sharp bookmakers)
- **Analyze performance** with CLV (Closing Line Value), ROI, and win rate metrics
- **Get instant alerts** via Telegram when value bets appear

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS |
| **Backend** | Next.js API Routes, Supabase Edge Functions |
| **Database** | Supabase (PostgreSQL) with RLS |
| **Auth** | Supabase Auth (Email, Google OAuth) |
| **Payments** | Stripe (International), Paystack (Nigeria) |
| **Extension** | Chrome Extension (Manifest V3) |
| **Alerts** | Telegram Bot (Aiogram 3.x) |
| **Hosting** | Vercel (Web), Supabase (DB), Railway (Scraper) |

## 📁 Project Structure

```
vantedge/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   │   ├── bets/           # Bet CRUD & sync
│   │   │   ├── opportunities/  # Value opportunities
│   │   │   ├── stats/          # User statistics
│   │   │   ├── profile/        # Profile management
│   │   │   ├── checkout/       # Stripe checkout
│   │   │   └── webhooks/       # Payment webhooks
│   │   ├── dashboard/          # Protected dashboard pages
│   │   ├── login/              # Login page
│   │   ├── signup/             # Signup page
│   │   └── page.tsx            # Landing page
│   ├── components/             # React components
│   │   └── dashboard/          # Dashboard components
│   └── lib/                    # Shared utilities
│       ├── supabase/           # Supabase clients
│       └── database.types.ts   # TypeScript types
├── extension/                  # Browser extension
│   ├── manifest.json
│   ├── background.js
│   ├── content-scripts/        # Bookmaker scrapers
│   └── popup/                  # Extension popup
├── supabase/
│   └── migrations/             # Database migrations
└── public/                     # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Supabase account
- Stripe account (for payments)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/vantedge.git
cd vantedge
pnpm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

### 3. Database Setup

Run the migration SQL in your Supabase SQL editor:

```sql
-- Located at: supabase/migrations/001_initial_schema.sql
```

Or use Supabase CLI:
```bash
supabase db push
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📱 Browser Extension

The extension auto-syncs bets from supported Nigerian bookmakers:

- **Bet9ja** (bet9ja.com)
- **SportyBet** (sportybet.com)
- **BetKing** (betking.com)

### Loading the Extension

1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder

## 💰 Pricing Tiers

| Feature | Free | Starter ($10/mo) | Pro ($49/mo) |
|---------|------|------------------|--------------|
| Manual bet tracking | ✅ | ✅ | ✅ |
| Extension auto-sync | 50/mo | Unlimited | Unlimited |
| Value alerts | 5/day | 30/day | Unlimited |
| Analytics history | 30 days | 1 year | Unlimited |
| Telegram alerts | ❌ | ✅ | ✅ |
| Kelly calculator | ❌ | ❌ | ✅ |
| CLV analysis | ❌ | ❌ | ✅ |

## 🔒 Security

- Row-Level Security (RLS) on all tables
- JWT-based authentication via Supabase Auth
- Secure webhook signature verification
- HTTPS-only in production
- Rate limiting on API routes

## 📊 Key Features

### 1. Bet Tracking
- Automatic sync via browser extension
- Manual entry for mobile bets
- Import from bet history pages

### 2. Value Detection
- Line-lag analysis (Pinnacle vs soft books)
- Real-time edge calculation
- Kelly criterion stake sizing

### 3. Analytics
- ROI tracking over time
- CLV (Closing Line Value) analysis
- Bookmaker performance comparison
- Sport/league breakdown

### 4. Alerts
- Telegram bot notifications
- Customizable edge thresholds
- Real-time opportunity alerts

## 🗺️ Roadmap

- [x] Phase 0: Foundation (Weeks 1-2)
- [ ] Phase 1: MVP (Weeks 3-6)
- [ ] Phase 2: Value Detection (Weeks 7-10)
- [ ] Phase 3: Alerts & Mobile (Weeks 11-14)
- [ ] Phase 4: Growth (Weeks 15-24)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

## 📄 License

This project is proprietary software. All rights reserved.

---

<p align="center">
  Built with ❤️ for Nigerian bettors
</p>
