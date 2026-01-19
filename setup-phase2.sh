#!/bin/bash
# Apply Phase 2 database migrations

echo "🚀 Setting up Phase 2: Odds Scraping & Value Detection"
echo "=================================================="

# Check if Supabase is linked
if [ ! -f ".git/supabase/.branches/_current_branch" ]; then
  echo "⚠️  Supabase not linked. Please run: supabase link"
  exit 1
fi

echo "📊 Applying odds functions migration..."
supabase db push --include-migrations "003_odds_functions.sql"

if [ $? -eq 0 ]; then
  echo "✅ Odds functions created successfully"
else
  echo "❌ Failed to apply odds functions migration"
  exit 1
fi

echo ""
echo "🌱 Seeding sample opportunities..."
supabase db push --include-migrations "004_seed_opportunities.sql"

if [ $? -eq 0 ]; then
  echo "✅ Sample data seeded successfully"
else
  echo "❌ Failed to seed data"
  exit 1
fi

echo ""
echo "=================================================="
echo "✨ Phase 2 setup complete!"
echo ""
echo "Next steps:"
echo "  1. Visit http://localhost:3000/opportunities"
echo "  2. View 7 sample value bets"
echo "  3. Test tier filtering (free/starter/pro)"
echo ""
echo "To implement actual scraping:"
echo "  - Update src/lib/scrapers/odds-scraper.ts with Puppeteer logic"
echo "  - Create a cron job to run scraping every 30s-2mins"
echo "  - Call detect_value_opportunities() function after each scrape"
