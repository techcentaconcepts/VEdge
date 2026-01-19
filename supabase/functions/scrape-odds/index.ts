// Supabase Edge Function for scheduled odds scraping
// Runs via pg_cron every 2 minutes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const BRIDGE_URL = Deno.env.get('BRIDGE_URL') || 'https://vantedge-production.up.railway.app'
const CRON_SECRET = Deno.env.get('CRON_SECRET') || ''

serve(async (req) => {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Supabase Cron] Starting scheduled odds scraping...')

    // Leagues to scrape
    const leagues = ['premierleague', 'laliga', 'seriea', 'npfl']
    
    // Bookmakers to scrape
    const bookmakers = ['sportybet', 'bet9ja', 'betking']

    const results = {
      timestamp: new Date().toISOString(),
      success: true,
      scraped: [] as any[],
      errors: [] as any[]
    }

    // Scrape all bookmakers for all leagues
    for (const league of leagues) {
      for (const bookmaker of bookmakers) {
        try {
          const url = `${BRIDGE_URL}/api/odds/${bookmaker}/${league}`
          console.log(`Scraping: ${bookmaker} - ${league}`)
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Supabase-Cron/1.0'
            },
            signal: AbortSignal.timeout(30000) // 30 second timeout
          })

          if (response.ok) {
            const data = await response.json()
            results.scraped.push({
              bookmaker,
              league,
              count: data.count || 0,
              status: 'success'
            })
            console.log(`✅ ${bookmaker} ${league}: ${data.count || 0} matches`)
          } else {
            throw new Error(`HTTP ${response.status}`)
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push({
            bookmaker,
            league,
            error: errorMsg
          })
          console.error(`❌ ${bookmaker} ${league}: ${errorMsg}`)
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    const summary = {
      total_scraped: results.scraped.length,
      total_errors: results.errors.length,
      success_rate: `${((results.scraped.length / (results.scraped.length + results.errors.length)) * 100).toFixed(1)}%`
    }

    console.log('[Supabase Cron] Scraping completed:', summary)

    return new Response(
      JSON.stringify({
        ...results,
        summary
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[Supabase Cron] Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
})
