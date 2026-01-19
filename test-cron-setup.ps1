# Test Supabase Cron Setup
# Run these commands to verify everything is working

Write-Host "🧪 Testing Vantedge Cron Setup" -ForegroundColor Cyan
Write-Host ""

# Test 1: Railway Bridge Health
Write-Host "1️⃣  Testing Railway Bridge..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "https://vantedge-production.up.railway.app/health" -Method Get
    Write-Host "✅ Bridge Status: $($health.status)" -ForegroundColor Green
    Write-Host "   Scraper Available: $($health.naijabet_available)" -ForegroundColor Green
} catch {
    Write-Host "❌ Bridge health check failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 2: Railway Bridge Scraper (SportyBet Premier League)
Write-Host "2️⃣  Testing SportyBet Scraper..." -ForegroundColor Yellow
try {
    $odds = Invoke-RestMethod -Uri "https://vantedge-production.up.railway.app/api/odds/sportybet/premierleague" -Method Get
    Write-Host "✅ SportyBet Response:" -ForegroundColor Green
    Write-Host "   Bookmaker: $($odds.bookmaker)" -ForegroundColor White
    Write-Host "   League: $($odds.league)" -ForegroundColor White
    Write-Host "   Matches Found: $($odds.count)" -ForegroundColor White
    if ($odds.count -gt 0) {
        Write-Host "   Sample Match: $($odds.matches[0].home_team) vs $($odds.matches[0].away_team)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ SportyBet scraper failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 3: Supabase Edge Function (requires deployment first)
Write-Host "3️⃣  Testing Supabase Edge Function..." -ForegroundColor Yellow
Write-Host "⚠️  Requires: supabase functions deploy scrape-odds" -ForegroundColor Yellow
$projectRef = "ywygmsjrqrjogzujutfv"
$anonKey = Read-Host "Enter your Supabase ANON key (or press Enter to skip)"

if ($anonKey) {
    try {
        $edgeUrl = "https://$projectRef.supabase.co/functions/v1/scrape-odds"
        $headers = @{
            "Authorization" = "Bearer $anonKey"
            "Content-Type" = "application/json"
        }
        
        $result = Invoke-RestMethod -Uri $edgeUrl -Method Post -Headers $headers -Body "{}"
        Write-Host "✅ Edge Function Response:" -ForegroundColor Green
        Write-Host "   Success: $($result.success)" -ForegroundColor White
        Write-Host "   Total Scraped: $($result.summary.total_scraped)" -ForegroundColor White
        Write-Host "   Total Errors: $($result.summary.total_errors)" -ForegroundColor White
        Write-Host "   Success Rate: $($result.summary.success_rate)" -ForegroundColor White
    } catch {
        Write-Host "❌ Edge Function test failed: $_" -ForegroundColor Red
        Write-Host "   This is normal if you haven't deployed the Edge Function yet" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  Skipped Edge Function test" -ForegroundColor Gray
}

Write-Host ""

# Test 4: SQL Connection Test
Write-Host "4️⃣  SQL Cron Verification" -ForegroundColor Yellow
Write-Host "   Run these queries in Supabase SQL Editor:" -ForegroundColor White
Write-Host ""
Write-Host "   -- Check if pg_cron is enabled" -ForegroundColor Cyan
Write-Host "   SELECT * FROM pg_extension WHERE extname = 'pg_cron';" -ForegroundColor Gray
Write-Host ""
Write-Host "   -- View scheduled cron jobs" -ForegroundColor Cyan
Write-Host "   SELECT * FROM cron.job;" -ForegroundColor Gray
Write-Host ""
Write-Host "   -- Manually trigger the scraping" -ForegroundColor Cyan
Write-Host "   SELECT trigger_odds_scraping();" -ForegroundColor Gray
Write-Host ""
Write-Host "   -- View cron execution history" -ForegroundColor Cyan
Write-Host "   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;" -ForegroundColor Gray
Write-Host ""

# Summary
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Deploy Edge Function: supabase functions deploy scrape-odds" -ForegroundColor White
Write-Host "2. Set secrets: supabase secrets set BRIDGE_URL=https://vantedge-production.up.railway.app" -ForegroundColor White
Write-Host "3. Run SQL migration in Supabase Dashboard (see DEPLOY_CRON_MANUAL.md)" -ForegroundColor White
Write-Host "4. Monitor: Dashboard -> Edge Functions -> scrape-odds -> Logs" -ForegroundColor White
Write-Host ""
Write-Host "✅ Tests Complete!" -ForegroundColor Green
