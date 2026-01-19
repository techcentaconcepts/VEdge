'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  TrendingUp,
  Target,
  Zap,
  Clock,
  Trophy,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react';

interface HotMarket {
  sport: string;
  league: string;
  market_type: string;
  avg_edge: number;
  max_edge: number;
  opportunities: number;
  hit_rate: number;
}

interface BookmakerSpeed {
  bookmaker: string;
  avg_reaction_sec: number;
  delayed_rate: number;
  market_coverage: number;
}

interface DailyEdgeStats {
  date: string;
  opportunities: number;
  avg_edge: number;
  hit_rate: number;
}

const sportEmojis: Record<string, string> = {
  football: '⚽',
  basketball: '🏀',
  tennis: '🎾',
  cricket: '🏏',
  hockey: '🏒',
  baseball: '⚾',
  esports: '🎮',
};

const bookmakerLogos: Record<string, string> = {
  bet9ja: '🟢',
  sportybet: '🔵',
  betking: '🟠',
  '1xbet': '🔴',
  betway: '⚫',
};

export default function AnalyticsPage() {
  const [hotMarkets, setHotMarkets] = useState<HotMarket[]>([]);
  const [bookmakerSpeeds, setBookmakerSpeeds] = useState<BookmakerSpeed[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyEdgeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(7);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadData();
  }, [timeRange]);

  async function loadData() {
    setLoading(true);
    try {
      // Get hottest markets
      const { data: marketsData } = await supabase.rpc('get_hottest_markets', {
        p_days: timeRange,
        p_limit: 10
      });

      if (marketsData) setHotMarkets(marketsData);

      // Get slowest bookmakers
      const { data: speedData } = await supabase.rpc('get_slowest_bookmakers', {
        p_days: timeRange
      });

      if (speedData) setBookmakerSpeeds(speedData);

      // Get daily edge stats
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: dailyData } = await supabase
        .from('market_edge_stats')
        .select('date, opportunities_found, avg_edge_percent, hit_rate')
        .gte('date', startDate)
        .order('date', { ascending: true });

      if (dailyData) {
        // Aggregate by date
        const byDate: Record<string, DailyEdgeStats> = {};
        dailyData.forEach(d => {
          const dateKey = d.date;
          if (!byDate[dateKey]) {
            byDate[dateKey] = {
              date: dateKey,
              opportunities: 0,
              avg_edge: 0,
              hit_rate: 0,
            };
          }
          byDate[dateKey].opportunities += d.opportunities_found || 0;
          byDate[dateKey].avg_edge = d.avg_edge_percent || 0;
          byDate[dateKey].hit_rate = d.hit_rate || 0;
        });
        setDailyStats(Object.values(byDate));
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate summary stats
  const totalOpportunities = hotMarkets.reduce((sum, m) => sum + m.opportunities, 0);
  const avgEdge = hotMarkets.length > 0
    ? hotMarkets.reduce((sum, m) => sum + m.avg_edge, 0) / hotMarkets.length
    : 0;
  const avgHitRate = hotMarkets.length > 0
    ? hotMarkets.reduce((sum, m) => sum + (m.hit_rate || 0), 0) / hotMarkets.length
    : 0;
  const slowestBookmaker = bookmakerSpeeds[0]?.bookmaker || 'N/A';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-emerald-600 dark:text-emerald-500" />
            Edge Analytics
          </h1>
          <p className="text-gray-500 dark:text-neutral-400 mt-1">
            Market insights and bookmaker performance analysis
          </p>
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-800 rounded-lg p-1">
          {([7, 14, 30] as const).map(days => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === days
                  ? 'bg-emerald-500 text-white'
                  : 'text-gray-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg">
              <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
            </div>
            <span className="text-sm text-gray-500 dark:text-neutral-400">Opportunities Found</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white">{totalOpportunities}</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" />
            Last {timeRange} days
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-500" />
            </div>
            <span className="text-sm text-gray-500 dark:text-neutral-400">Average Edge</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white">{avgEdge.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">Across all markets</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-500/10 rounded-lg">
              <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-500" />
            </div>
            <span className="text-sm text-gray-500 dark:text-neutral-400">Hit Rate</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white">{avgHitRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">Value bets winning</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-amber-600 dark:text-amber-500" />
            </div>
            <span className="text-sm text-gray-500 dark:text-neutral-400">Best to Snipe</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white capitalize">{slowestBookmaker}</p>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">Slowest to react</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hottest Markets */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
              Hottest Markets
            </h2>
            <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
              Leagues and markets with highest value
            </p>
          </div>

          {hotMarkets.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-neutral-500">
              No market data yet. Data will appear as opportunities are detected.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-neutral-800">
              {hotMarkets.map((market, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {sportEmojis[market.sport] || '🎯'}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">{market.league}</p>
                        <p className="text-xs text-gray-500 dark:text-neutral-400">{market.market_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {market.avg_edge.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-neutral-500">avg edge</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500 dark:text-neutral-400">
                        <span className="text-neutral-900 dark:text-white font-medium">{market.opportunities}</span> opportunities
                      </span>
                      <span className="text-gray-500 dark:text-neutral-400">
                        Max: <span className="text-amber-600 dark:text-amber-400 font-medium">{market.max_edge.toFixed(1)}%</span>
                      </span>
                    </div>
                    {market.hit_rate > 0 && (
                      <span className={`px-2 py-0.5 rounded ${
                        market.hit_rate >= 50 ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                      }`}>
                        {market.hit_rate.toFixed(0)}% hit rate
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookmaker Speed Rankings */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-500" />
              Bookmaker Reaction Speed
            </h2>
            <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
              Which bookies are slowest to update odds
            </p>
          </div>

          {bookmakerSpeeds.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-neutral-500">
              No speed data yet. Data will appear as odds movements are tracked.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-neutral-800">
              {bookmakerSpeeds.map((bookie, index) => {
                const delayRating = bookie.avg_reaction_sec > 60 ? 'slow' : 
                                   bookie.avg_reaction_sec > 30 ? 'medium' : 'fast';
                return (
                  <div key={bookie.bookmaker} className="p-4 hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                          index === 0 ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-gray-100 dark:bg-neutral-800'
                        }`}>
                          {bookmakerLogos[bookie.bookmaker] || '📊'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-white capitalize flex items-center gap-2">
                            {bookie.bookmaker}
                            {index === 0 && (
                              <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs rounded">
                                🎯 Best to snipe
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-neutral-400">
                            {bookie.market_coverage?.toFixed(0) || 0}% market coverage
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-neutral-900 dark:text-white">
                          {bookie.avg_reaction_sec?.toFixed(0) || 0}s
                        </p>
                        <p className="text-xs text-gray-500 dark:text-neutral-500">avg delay</p>
                      </div>
                    </div>

                    {/* Speed Bar */}
                    <div className="relative h-2 bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className={`absolute left-0 top-0 h-full rounded-full ${
                          delayRating === 'slow' ? 'bg-emerald-500' :
                          delayRating === 'medium' ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min((bookie.avg_reaction_sec || 0) / 120 * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-neutral-500">
                      <span>Fast (0s)</span>
                      <span className={
                        delayRating === 'slow' ? 'text-emerald-600 dark:text-emerald-400' :
                        delayRating === 'medium' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                      }>
                        {delayRating === 'slow' ? '🐢 Slow' : delayRating === 'medium' ? '⚡ Medium' : '🚀 Fast'}
                      </span>
                      <span>Slow (120s+)</span>
                    </div>

                    {bookie.delayed_rate > 0 && (
                      <p className="text-xs text-gray-500 dark:text-neutral-400 mt-2">
                        Delayed on <span className="text-neutral-900 dark:text-white">{bookie.delayed_rate.toFixed(0)}%</span> of odds changes
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-4 bg-emerald-500/10 border-t border-emerald-500/20">
            <p className="text-sm text-emerald-800 dark:text-emerald-200">
              <span className="font-medium">💡 Pro Tip:</span> Focus your bets on{' '}
              <span className="font-semibold capitalize">{slowestBookmaker}</span> for maximum CLV advantage.
            </p>
          </div>
        </div>
      </div>

      {/* Daily Trend Chart */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-600 dark:text-purple-500" />
            Daily Edge Trend
          </h2>
          <span className="text-sm text-gray-500 dark:text-neutral-500">Last {timeRange} days</span>
        </div>

        {dailyStats.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-500 dark:text-neutral-500">
            No daily data available yet
          </div>
        ) : (
          <div className="h-48 flex items-end gap-2">
            {dailyStats.map((day, i) => {
              const maxOpps = Math.max(...dailyStats.map(d => d.opportunities));
              const height = maxOpps > 0 ? (day.opportunities / maxOpps) * 100 : 0;
              
              return (
                <div 
                  key={day.date} 
                  className="flex-1 flex flex-col items-center gap-1"
                  title={`${day.date}: ${day.opportunities} opportunities, ${day.avg_edge?.toFixed(1) || 0}% avg edge`}
                >
                  <div className="w-full flex flex-col items-center h-40">
                    <div 
                      className="w-full bg-emerald-500 rounded-t transition-all hover:bg-emerald-400"
                      style={{ height: `${height}%`, minHeight: day.opportunities > 0 ? '4px' : '0' }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-neutral-500">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-gray-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-sm text-gray-500 dark:text-neutral-400">Opportunities Found</span>
          </div>
        </div>
      </div>

      {/* Marketing Insight */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-6">
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">📢 Marketing Insight</h3>
        <p className="text-gray-600 dark:text-neutral-300">
          Based on the last {timeRange} days of data, the best value can be found in{' '}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {hotMarkets[0]?.league || 'Premier League'}
          </span>{' '}
          ({hotMarkets[0]?.market_type || 'Over/Under'} markets), with an average edge of{' '}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {hotMarkets[0]?.avg_edge?.toFixed(1) || 0}%
          </span>. 
          Target users who bet on{' '}
          <span className="font-semibold text-amber-600 dark:text-amber-400 capitalize">{slowestBookmaker}</span>{' '}
          for maximum conversion.
        </p>
      </div>
    </div>
  );
}
