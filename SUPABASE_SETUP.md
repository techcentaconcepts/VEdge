# Supabase Setup Guide - Value Opportunities Engine

## 1. Run the SQL Migration

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/20260119_value_opportunities_upsert.sql`
5. Click **Run** or press `Ctrl+Enter`

This creates:
- ✅ `value_opportunities` table with auto-calculated edge percentages
- ✅ `upsert_value_bet()` RPC function for atomic updates
- ✅ `cleanup_stale_odds()` function to remove old data
- ✅ Indexes for fast queries
- ✅ Row Level Security policies

## 2. Configure Railway Environment Variables

In Railway dashboard → Your service → Variables, add:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-key-here
```

Get these from: Supabase Dashboard → Settings → API

**Important:** Use the `anon` key, NOT the `service_role` key (for security)

## 3. Test the Integration

Once Railway redeploys, test the endpoint:

```bash
curl "https://vantedge-production.up.railway.app/api/odds/sportybet/premierleague"
```

Check Supabase → Table Editor → `value_opportunities` to see the synced data.

## 4. Query Value Bets

Find high-value opportunities (edge >= 5%):

```sql
SELECT 
    match_name,
    league_name,
    soft_bookie,
    best_edge_market,
    best_edge_percent,
    soft_odds_home,
    soft_odds_draw,
    soft_odds_away,
    kickoff_time
FROM value_opportunities
WHERE best_edge_percent >= 5.0
ORDER BY best_edge_percent DESC
LIMIT 10;
```

## 5. Set Up Stale Data Cleanup (Optional)

Create a Supabase Edge Function to run every 10 minutes:

1. Go to **Edge Functions** in Supabase dashboard
2. Create new function: `cleanup-stale-odds`
3. Deploy this code:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabase.rpc('cleanup_stale_odds')
  
  return new Response(
    JSON.stringify({ deleted: data, error }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

4. Set up a cron trigger: `0 */10 * * *` (every 10 minutes)

## 6. Connect to Frontend

Your Next.js app can now query value bets:

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()

const { data: valueBets } = await supabase
  .from('value_opportunities')
  .select('*')
  .gte('best_edge_percent', 5.0)
  .order('best_edge_percent', { ascending: false })
  .limit(10)
```

## 7. Enable Real-Time Updates (Optional)

For live odds updates in the UI:

```typescript
const channel = supabase
  .channel('value-bets')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'value_opportunities'
    },
    (payload) => {
      console.log('Odds updated:', payload)
      // Update UI
    }
  )
  .subscribe()
```

## Database Schema

```
value_opportunities
├── match_id (PK)           - Unique identifier
├── match_name              - "Arsenal vs Chelsea"
├── league_name             - "Premier League"
├── kickoff_time            - When the match starts
├── sharp_odds_home/draw/away  - Pinnacle odds (the "truth")
├── soft_odds_home/draw/away   - Nigerian bookie odds
├── edge_home_percent (GENERATED) - Auto-calculated edge
├── edge_draw_percent (GENERATED)
├── edge_away_percent (GENERATED)
├── best_edge_percent (GENERATED) - Highest edge
├── best_edge_market (GENERATED)  - Which market has best value
├── is_alerted              - Has user been notified?
└── updated_at              - Last update timestamp
```

## Value Calculation Formula

```
Edge % = ((Soft Odds / Sharp Odds) - 1) × 100
```

Example:
- Sharp (Pinnacle): 2.00
- Soft (SportyBet): 2.10
- Edge: ((2.10 / 2.00) - 1) × 100 = 5%

Anything above 3-5% is considered a value bet worth alerting.
