#!/bin/bash

# Deploy Supabase Edge Function and Setup Cron
# Run this script to deploy the complete Supabase cron setup

echo "🚀 Deploying Supabase Cron Job Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"
echo ""

# Step 1: Deploy Edge Function
echo "📦 Step 1: Deploying Edge Function..."
supabase functions deploy scrape-odds

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Edge Function deployed${NC}"
else
    echo -e "${RED}❌ Failed to deploy Edge Function${NC}"
    exit 1
fi

echo ""

# Step 2: Set Environment Secrets
echo "🔐 Step 2: Setting environment variables..."
read -p "Enter your Railway Bridge URL (default: https://vantedge-production.up.railway.app): " BRIDGE_URL
BRIDGE_URL=${BRIDGE_URL:-https://vantedge-production.up.railway.app}

read -p "Enter a secure cron secret (or press Enter to skip): " CRON_SECRET

supabase secrets set BRIDGE_URL="$BRIDGE_URL"
if [ ! -z "$CRON_SECRET" ]; then
    supabase secrets set CRON_SECRET="$CRON_SECRET"
fi

echo -e "${GREEN}✓ Secrets configured${NC}"
echo ""

# Step 3: Instructions for SQL Migration
echo "📝 Step 3: Database Setup"
echo ""
echo -e "${YELLOW}Manual steps required:${NC}"
echo ""
echo "1. Go to your Supabase Dashboard → SQL Editor"
echo "2. Click 'New Query'"
echo "3. Copy and paste the contents of:"
echo -e "   ${GREEN}supabase/migrations/20260119_setup_cron_scraping.sql${NC}"
echo "4. Click 'Run' or press Ctrl+Enter"
echo ""
echo "This will:"
echo "  - Enable pg_cron extension"
echo "  - Enable pg_net extension (if not already enabled)"
echo "  - Create trigger_odds_scraping() function"
echo "  - Schedule cron job to run every 5 minutes"
echo ""

read -p "Press Enter when you've completed the SQL migration..."

echo ""

# Step 4: Verification
echo "✅ Step 4: Verification"
echo ""
echo "Test the Edge Function manually:"
PROJECT_REF=$(supabase projects list --json | grep -o '"ref":"[^"]*' | grep -o '[^"]*$' | head -1)
if [ ! -z "$PROJECT_REF" ]; then
    echo ""
    echo -e "${GREEN}curl -X POST https://$PROJECT_REF.supabase.co/functions/v1/scrape-odds \\${NC}"
    echo -e "${GREEN}  -H \"Authorization: Bearer YOUR_ANON_KEY\" \\${NC}"
    echo -e "${GREEN}  -H \"Content-Type: application/json\"${NC}"
else
    echo "Could not auto-detect project ref. Check your Supabase dashboard."
fi

echo ""
echo "Verify cron job in SQL Editor:"
echo -e "${GREEN}SELECT * FROM cron.job;${NC}"
echo ""
echo "Manually trigger (for testing):"
echo -e "${GREEN}SELECT trigger_odds_scraping();${NC}"
echo ""
echo "View cron history:"
echo -e "${GREEN}SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;${NC}"
echo ""

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Your odds scraping cron job is now set up to run every 5 minutes."
echo "Monitor it in: Supabase Dashboard → Edge Functions → scrape-odds → Logs"
