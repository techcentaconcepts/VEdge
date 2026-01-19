'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Clock, Target, AlertCircle, RefreshCw, Filter } from 'lucide-react';

interface Opportunity {
  id: string;
  match_name: string;
  sport: string;
  league: string;
  kickoff_time: string;
  market: string;
  selection: string;
  sharp_bookmaker: string;
  sharp_odds: number | null;
  soft_bookmaker: string;
  soft_odds: number;
  edge_percent: number;
  kelly_fraction: number | null;
  status: string;
  detected_at: string;
  bet_link?: string;
}

interface OpportunitiesListProps {
  tier?: string;
}

export function OpportunitiesList({ tier = 'free' }: OpportunitiesListProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [minEdge, setMinEdge] = useState(3);
  const [sport, setSport] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(tier === 'pro');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    loadOpportunities();
    
    // Auto-refresh for pro users
    if (autoRefresh) {
      const interval = setInterval(loadOpportunities, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [minEdge, sport, autoRefresh]);

  async function loadOpportunities() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        min_edge: String(minEdge),
        ...(sport !== 'all' && { sport }),
      });

      const response = await fetch(`/api/opportunities?${params}`);
      if (!response.ok) throw new Error('Failed to fetch opportunities');

      const data = await response.json();
      setOpportunities(data.opportunities || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading opportunities:', error);
    } finally {
      setLoading(false);
    }
  }

  function getEdgeClass(edge: number): string {
    if (edge >= 10) return 'edge-high';
    if (edge >= 5) return 'edge-medium';
    return 'edge-low';
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 1) {
      const diffMinutes = Math.round(diffHours * 60);
      return `${diffMinutes}m`;
    } else if (diffHours < 24) {
      return `${Math.round(diffHours)}h`;
    } else {
      return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
    }
  }

  function formatKickoff(dateString: string): string {
    return new Date(dateString).toLocaleString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Value Opportunities
          </h2>
          {lastUpdate && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>

        <button
          onClick={loadOpportunities}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-neutral-400 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
        <Filter className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Min Edge:
          </label>
          <select
            value={minEdge}
            onChange={(e) => setMinEdge(Number(e.target.value))}
            className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm"
          >
            <option value="-100">All (Debug)</option>
            <option value="0">0%+</option>
            <option value="2">2%+</option>
            <option value="3">3%+</option>
            <option value="5">5%+</option>
            <option value="10">10%+</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Sport:
          </label>
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm"
          >
            <option value="all">All Sports</option>
            <option value="football">Football</option>
            <option value="basketball">Basketball</option>
            <option value="tennis">Tennis</option>
          </select>
        </div>

        {tier === 'pro' && (
          <label className="flex items-center gap-2 ml-auto">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-neutral-300"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              Auto-refresh (30s)
            </span>
          </label>
        )}
      </div>

      {/* Tier upgrade notice */}
      {tier === 'free' && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Limited to top 3 opportunities (5-minute delay)
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Upgrade to Starter for real-time alerts and unlimited access
            </p>
          </div>
        </div>
      )}

      {/* Opportunities List */}
      {loading && opportunities.length === 0 ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 text-neutral-400 animate-spin mx-auto mb-3" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading opportunities...</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <Target className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
          <p className="text-neutral-600 dark:text-neutral-400 text-lg font-medium">
            No active opportunities
          </p>
          <p className="text-neutral-500 dark:text-neutral-500 text-sm mt-1">
            Try lowering the minimum edge filter or check back soon
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900 dark:text-white text-lg">
                    {opp.match_name}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {opp.league} • {opp.market} - {opp.selection}
                  </p>
                </div>

                <span
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold ${getEdgeClass(
                    opp.edge_percent
                  )}`}
                >
                  +{opp.edge_percent.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {opp.soft_bookmaker}:
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-white ml-2">
                    {opp.soft_odds.toFixed(2)}
                  </span>
                </div>

                {opp.sharp_odds && (
                  <div>
                    <span className="text-neutral-600 dark:text-neutral-400">
                      {opp.sharp_bookmaker}:
                    </span>
                    <span className="font-semibold text-neutral-900 dark:text-white ml-2">
                      {opp.sharp_odds.toFixed(2)}
                    </span>
                  </div>
                )}

                {!opp.sharp_odds && tier === 'free' && (
                  <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                    <span className="text-xs">🔒 Upgrade to see sharp odds</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 ml-auto text-neutral-600 dark:text-neutral-400">
                  <Clock className="h-4 w-4" />
                  <span>{formatKickoff(opp.kickoff_time)}</span>
                </div>
              </div>

              {opp.kelly_fraction && tier !== 'free' && (
                <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="font-medium">Recommended stake:</span>{' '}
                  {(opp.kelly_fraction * 100).toFixed(2)}% of bankroll (Quarter Kelly)
                </div>
              )}

              {opp.bet_link && (
                <a
                  href={opp.bet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <TrendingUp className="h-4 w-4" />
                  Place Bet on {opp.soft_bookmaker}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
