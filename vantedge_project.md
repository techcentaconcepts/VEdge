# Vantedge (by Techcenta) 
> **Tagline:** Trade the Market, Don't Gamble on the Game.

## 1. Executive Summary
Vantedge is a high-performance betting analytics SaaS designed for professional "career" bettors. Unlike traditional sportsbooks, Vantedge acts as a decision-support tool, leveraging "Line-Lag" data between global sharp markets and local bookmakers (primarily in Nigeria and Africa). 

By integrating Techcenta’s core infrastructure, Vantedge provides not only the data to find an edge but also the stealth tools to protect user accounts from being limited or banned.

---

## 2. Product Architecture (Vercel + Supabase Stack)
The platform is built on a modern, serverless architecture for maximum scalability and low overhead.

### Technical Stack
| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js (Vercel) | Real-time Dashboard & PWA |
| **Backend/Auth** | Supabase | User Auth, Real-time DB, & Cron Jobs |
| **Naija Bridge** | FastAPI (Python) | Bypassing local anti-bot protections |
| **Automation** | Playwright | Headless browser for local odds scraping |
| **Infrastructure** | Techcenta Proxies | Residential IPs for Stealth Mode |

### Database Schema (Supabase/PostgreSQL)
- **`profiles`**: Manages user subscription tiers (`free`, `pro`, `elite`).
- **`bankrolls`**: Tracks multi-currency balances across different bookmakers.
- **`value_opportunities`**: Real-time table of detected "Edges" (where Soft Odds > Sharp Odds).
- **`bets`**: Historical log for ROI auditing and Closing Line Value (CLV) analysis.

---

## 3. Core Features & "Stealth Suite"
### Value Scanner
- **Line-Lag Monitoring:** Scans global sharp books (Pinnacle/Betfair) vs. local books (Bet9ja/King).
- **Kelly Criterion Calculator:** Recommends optimal stake sizes based on the detected edge.
- **Telegram Bridge:** Real-time push alerts with deep-links to bet slips.

### Techcenta Stealth Suite
- **Residential Proxy Integration:** Routes traffic through home-user IPs to mimic organic behavior.
- **Fingerprint Masking:** Randomized Canvas and WebGL signatures to prevent bookie tracking.
- **Mug Bet Scheduler:** AI-driven "random" betting to mask professional winning patterns.

---

## 4. Market Strategy & Monetization
### The "Free" Hook: Bankroll Auditor
Users can upload their betting history for a free performance audit. The app visualizes their ROI and alerts them if they are losing value to the "Vig."

### Pricing Tiers
- **Explorer (Free):** Basic tracking + 5-minute delayed odds.
- **Vantedge Pro ($10/mo):** Real-time scanner + Telegram alerts.
- **Stealth Mode ($49/mo):** Pro Features + Techcenta Stealth Infrastructure.

---

## 5. Competitive Advantage
| Feature | Global Giants (OddsJam) | **Vantedge** |
| :--- | :--- | :--- |
| **Price** | $100 - $200/mo | **$10 - $49/mo** |
| **Local Coverage** | Limited/None | **Primary Focus (Nigeria/Africa)** |
| **Stealth Tools** | None | **Fully Integrated** |
| **Mobile UX** | Web-heavy | **Telegram-First** |

---

## 6. Legal & Risk Framework
### Informational Tool Status
Vantedge is a **SaaS Data Provider**, not a gambling operator. 
- No bets are placed on-platform.
- No deposits/withdrawals of gambling funds.
- Compliance focus: GDPR (UK) and NDPA (Nigeria).

### Risk Disclaimer
> **Disclaimer:** Vantedge provides mathematical data for informational purposes only. Sports betting involves significant risk of loss. Vantedge is not responsible for financial outcomes or account restrictions imposed by third-party bookmakers.

---

## 7. Development Roadmap
- **Phase 1 (Month 1-2):** Launch Free Auditor & Supabase Backend.
- **Phase 2 (Month 3-4):** Integrate "Naija Bridge" for live odds.
- **Phase 3 (Month 5-6):** Release Techcenta Stealth Suite for Elite users.



# Vantedge (by Techcenta) 
> **Version:** 2.0  
> **Tagline:** Trade the Market, Don't Gamble on the Game.

## 1. Executive Summary
Vantedge is a high-performance betting analytics and infrastructure SaaS. It targets "career" bettors by identifying "Line-Lag" (price discrepancies) between global sharp markets and local bookmakers (UK/EU and Nigeria/Africa). Vantedge solves the two biggest pain points for professional bettors: **finding a mathematical edge** and **preventing account limitations (gubbing)** through integrated stealth technology.

---

## 2. Product Architecture (Serverless + Bridge)
The platform uses a decoupled architecture to manage high-frequency data and bypass local anti-bot protections.

### Technical Stack
| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js (Vercel) | Professional Trading Dashboard & PWA |
| **Database** | Supabase (PostgreSQL) | Real-time Edge tracking & User Auth |
| **Data Bridge** | FastAPI (Railway/Render) | Python-based scraper for local bookies (Bet9ja, etc.) |
| **Browser Tool** | Chrome/Kiwi Extension | Automated history sync from non-exportable bookies |
| **Stealth Layer** | Techcenta Residential IPs | Fingerprint masking & IP rotation |

---

## 3. Key Solutions & Workarounds

### A. The "Auto-Sync" (Solving the Export Problem)
Since Nigerian bookies (Bet9ja, SportyBet, Betking) lack "Export to CSV" buttons, Vantedge provides:
- **Vantedge Sync Extension:** A browser tool that scrapes "My Bets" HTML directly from the bookie's site and pushes JSON to Supabase.
- **HTML Parser:** A fallback where users upload "Saved Web Pages" of their history for instant auditing.

### B. The "Line-Lag" Scanner
- Monitors **Pinnacle/Betfair** (Sharp) vs. **Local Soft Books** (Nigeria/Africa/UK).
- Detects **Steam Moves:** High-volume money moving the global market before local bookies adjust.

### C. The Stealth Suite (Powered by Techcenta)
- **Residential Tunneling:** Prevents bookies from flagging users as "sharps" by masking their IP.
- **Behavioral Simulation:** Adds micro-delays to automated actions to mimic human interaction.

---

## 4. User Experience & Onboarding

### The "Free" Hook: Bankroll Auditor
- **The Pitch:** "Stop guessing. See your real ROI."
- **Function:** Users sync their history via the Extension. Vantedge calculates **Closing Line Value (CLV)** to prove if the user is skilled or just lucky.
- **Conversion:** Once an audit is complete, the app offers the "Live Value Scanner" to fix poor performance.

### Interface Distribution
1.  **Telegram Bot:** Primary delivery for "Instant Alerts" (ideal for African data constraints).
2.  **Web Dashboard:** Deep-dive analytics, bankroll charts, and strategy building.

---

## 5. Monetization & Pricing
| Tier | Price (Target) | Target User |
| :--- | :--- | :--- |
| **Explorer** | Free | Casuals tracking P&L and CLV. |
| **Starter** | **$10 / mo (₦15k)** | Serious side-hustlers; access to Real-time Alerts. |
| **Pro/Stealth** | **$49 / mo (₦75k)** | Career bettors; includes Techcenta Stealth Infrastructure. |

---

## 6. Competitive Advantage: Vantedge vs. Global Giants
- **Localization:** Coverage of Nigerian/African "Soft Lines" that OddsJam/RebelBetting ignore.
- **Frictionless Sync:** No manual entry. Our browser extension builds the "Source of Truth" for African punters.
- **Infrastructure:** We don't just find the bet; we provide the **Stealth Browser** (Techcenta) to help you place it safely.

---

## 7. Legal & Compliance
- **Status:** Software-as-a-Service (SaaS) Data Provider.
- **Compliance:** GDPR (UK) and NDPA (Nigeria) compliant data handling.
- **Risk Shield:** "Vantedge is a mathematical tool. We do not facilitate gambling or handle wagers."

---

## 8. Strategic Roadmap
- **M1:** Launch **FastAPI Bridge** (EPL/NPFL focus) + **Telegram Alert Bot**.
- **M2:** Release **Chrome Sync Extension** for automated Bet9ja/SportyBet auditing.
- **M3:** Launch **Stealth Suite** beta for high-stakes UK/Nigerian syndicates.




# Vantedge (by Techcenta) 
> **Version:** 3.0 (Master Spec)  
> **Tagline:** Trade the Market, Don't Gamble on the Game.

## 1. Technical Pivot: The Sync Extension
- **Function:** Automates data ingestion from non-exportable African bookmakers.
- **Tech:** Manifest V3, JavaScript DOM Scraper, Supabase Auth.
- **Privacy:** Local-only processing before encrypted sync to Vantedge cloud.

## 2. Updated Marketing Hierarchy
1.  **Phase 1 (The Hook):** Free Bankroll Audit via Browser Extension.
2.  **Phase 2 (The Retention):** Performance tracking & CLV (Closing Line Value) insights.
3.  **Phase 3 (The Revenue):** Paid "Value Scanner" alerts & "Stealth Suite" IPs.

## 3. Deployment Stack
- **Dashboard:** Vercel (Next.js)
- **Backend:** Supabase (Postgres + Edge Functions)
- **Data Scraper:** FastAPI (Python/Playwright) on Railway.app.
- **Delivery:** Telegram Bot (Aiogram 3.x).
- **Stealth:** Techcenta Residential Proxy Nodes.

## 4. Legal & Regulatory
- **SaaS Status:** Informational tool only; no wagering on-site.
- **Disclaimers:** Built-in "Risk of Loss" warnings and "No Profit Guarantee" clauses.