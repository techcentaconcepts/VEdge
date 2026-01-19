'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  Activity,
  Server,
  Wifi,
  WifiOff,
  AlertTriangle,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  Pause,
  TrendingUp,
  Globe,
  Shield,
} from 'lucide-react';

interface ScraperStatus {
  bookmaker: string;
  status: 'healthy' | 'degraded' | 'down' | 'maintenance';
  latency_ms: number | null;
  success_rate: number | null;
  last_check: string;
  error_count: number;
}

interface ProxyStats {
  total: number;
  active: number;
  banned: number;
  cooling: number;
}

interface LatencyPoint {
  time: string;
  bet9ja: number;
  sportybet: number;
  betking: number;
  pinnacle: number;
}

const statusConfig = {
  healthy: { color: 'emerald', icon: CheckCircle, label: 'Healthy' },
  degraded: { color: 'amber', icon: AlertTriangle, label: 'Degraded' },
  down: { color: 'red', icon: XCircle, label: 'Down' },
  maintenance: { color: 'blue', icon: Pause, label: 'Maintenance' },
};

const bookmakerLogos: Record<string, string> = {
  bet9ja: '🟢',
  sportybet: '🔵',
  betking: '🟠',
  '1xbet': '🔴',
  pinnacle: '⚪',
};

export default function ScraperHealthPage() {
  const [scrapers, setScrapers] = useState<ScraperStatus[]>([]);
  const [proxyStats, setProxyStats] = useState<ProxyStats | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<LatencyPoint[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const loadData = useCallback(async () => {
    try {
      // Get scraper status
      const { data: scraperData } = await supabase.rpc('get_scraper_summary');
      if (scraperData) {
        setScrapers(scraperData);
      }

      // Get proxy stats
      const { data: proxyData } = await supabase
        .from('proxy_pool')
        .select('status');
      
      if (proxyData) {
        setProxyStats({
          total: proxyData.length,
          active: proxyData.filter(p => p.status === 'active').length,
          banned: proxyData.filter(p => p.status === 'banned').length,
          cooling: proxyData.filter(p => p.status === 'cooling').length,
        });
      }

      // Get recent scraper health history for chart
      const { data: historyData } = await supabase
        .from('scraper_health')
        .select('bookmaker, latency_ms, created_at')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (historyData) {
        // Transform to chart format (simplified)
        const grouped: Record<string, LatencyPoint> = {};
        historyData.forEach(h => {
          const time = new Date(h.created_at).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          if (!grouped[time]) {
            grouped[time] = { time, bet9ja: 0, sportybet: 0, betking: 0, pinnacle: 0 };
          }
          if (h.bookmaker in grouped[time]) {
            (grouped[time] as any)[h.bookmaker] = h.latency_ms || 0;
          }
        });
        setLatencyHistory(Object.values(grouped).slice(-12));
      }

      // Get recent proxy logs
      const { data: logsData } = await supabase
        .from('proxy_logs')
        .select('*, proxy_pool(ip_address)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (logsData) {
        setRecentLogs(logsData);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const healthyCount = scrapers.filter(s => s.status === 'healthy').length;
  const totalCount = scrapers.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Server className="w-7 h-7 text-emerald-500" />
            Scraper Health Monitor
          </h1>
          <p className="text-neutral-400 mt-1">
            Real-time status of the Python Bridge and data scrapers
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div className={`p-4 rounded-xl border ${
        healthyCount === totalCount
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : healthyCount > totalCount / 2
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-red-500/10 border-red-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className={`w-6 h-6 ${
              healthyCount === totalCount ? 'text-emerald-500' :
              healthyCount > totalCount / 2 ? 'text-amber-500' : 'text-red-500'
            }`} />
            <div>
              <p className="font-semibold text-white">
                {healthyCount === totalCount 
                  ? 'All Systems Operational'
                  : healthyCount > totalCount / 2
                  ? 'Partial Outage Detected'
                  : 'Major Outage in Progress'}
              </p>
              <p className="text-sm text-neutral-400">
                {healthyCount}/{totalCount} scrapers healthy
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {scrapers.map(s => (
              <div
                key={s.bookmaker}
                className={`w-3 h-3 rounded-full ${
                  s.status === 'healthy' ? 'bg-emerald-500' :
                  s.status === 'degraded' ? 'bg-amber-500' :
                  s.status === 'maintenance' ? 'bg-blue-500' : 'bg-red-500'
                }`}
                title={`${s.bookmaker}: ${s.status}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Wifi className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{healthyCount}</p>
              <p className="text-sm text-neutral-400">Active Scrapers</p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {scrapers.filter(s => s.latency_ms).length > 0
                  ? Math.round(scrapers.reduce((sum, s) => sum + (s.latency_ms || 0), 0) / scrapers.filter(s => s.latency_ms).length)
                  : '-'}
                <span className="text-sm font-normal text-neutral-400">ms</span>
              </p>
              <p className="text-sm text-neutral-400">Avg Latency</p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Globe className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {proxyStats?.active || 0}
                <span className="text-sm font-normal text-neutral-400">/{proxyStats?.total || 0}</span>
              </p>
              <p className="text-sm text-neutral-400">Active Proxies</p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{proxyStats?.banned || 0}</p>
              <p className="text-sm text-neutral-400">Banned IPs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scraper Status Cards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Bookmaker Scrapers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scrapers.map((scraper) => {
            const config = statusConfig[scraper.status];
            const StatusIcon = config.icon;

            return (
              <div
                key={scraper.bookmaker}
                className={`bg-neutral-900 border rounded-xl p-5 ${
                  scraper.status === 'healthy' ? 'border-neutral-800' :
                  scraper.status === 'degraded' ? 'border-amber-500/50' :
                  scraper.status === 'down' ? 'border-red-500/50' : 'border-blue-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{bookmakerLogos[scraper.bookmaker] || '📊'}</span>
                    <div>
                      <h3 className="font-semibold text-white capitalize">{scraper.bookmaker}</h3>
                      <div className={`flex items-center gap-1 text-sm text-${config.color}-500`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {config.label}
                      </div>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full bg-${config.color}-500 animate-pulse`} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wide">Latency</p>
                    <p className="text-lg font-semibold text-white">
                      {scraper.latency_ms ? `${scraper.latency_ms}ms` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wide">Success Rate</p>
                    <p className="text-lg font-semibold text-white">
                      {scraper.success_rate ? `${scraper.success_rate}%` : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400">Last Check</span>
                    <span className="text-neutral-300">
                      {scraper.last_check 
                        ? new Date(scraper.last_check).toLocaleTimeString()
                        : 'Never'}
                    </span>
                  </div>
                  {scraper.error_count > 0 && (
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-red-400">Errors</span>
                      <span className="text-red-400 font-medium">{scraper.error_count}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Latency Chart Placeholder */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Live Latency Tracker
          </h2>
          <span className="text-sm text-neutral-500">Last 1 hour</span>
        </div>
        
        {latencyHistory.length > 0 ? (
          <div className="h-48 flex items-end gap-2">
            {latencyHistory.map((point, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-0.5 items-end h-32">
                  {['bet9ja', 'sportybet', 'betking', 'pinnacle'].map((bm, j) => (
                    <div
                      key={bm}
                      className={`flex-1 rounded-t ${
                        j === 0 ? 'bg-emerald-500' :
                        j === 1 ? 'bg-blue-500' :
                        j === 2 ? 'bg-orange-500' : 'bg-neutral-400'
                      }`}
                      style={{ 
                        height: `${Math.min(((point as any)[bm] || 0) / 10, 100)}%`,
                        minHeight: (point as any)[bm] ? '4px' : '0'
                      }}
                      title={`${bm}: ${(point as any)[bm]}ms`}
                    />
                  ))}
                </div>
                <span className="text-xs text-neutral-500">{point.time}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-neutral-500">
            No latency data available yet
          </div>
        )}

        <div className="flex items-center justify-center gap-6 mt-4">
          {[
            { name: 'Bet9ja', color: 'bg-emerald-500' },
            { name: 'SportyBet', color: 'bg-blue-500' },
            { name: 'BetKing', color: 'bg-orange-500' },
            { name: 'Pinnacle', color: 'bg-neutral-400' },
          ].map(item => (
            <div key={item.name} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${item.color}`} />
              <span className="text-sm text-neutral-400">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Proxy Rotation Log */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-500" />
            Proxy Rotation Log
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Monitor Techcenta Stealth IP usage and blocks
          </p>
        </div>

        <div className="divide-y divide-neutral-800">
          {recentLogs.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              No proxy logs yet. Logs will appear when scrapers make requests.
            </div>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${
                    log.was_blocked ? 'bg-red-500' : 
                    log.response_code === 200 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`} />
                  <div>
                    <p className="text-sm text-white font-medium">
                      {log.proxy_pool?.ip_address || 'Unknown IP'} → {log.bookmaker}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {log.request_url?.substring(0, 50)}...
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    log.was_blocked ? 'text-red-400' :
                    log.response_code === 200 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {log.was_blocked ? log.error_type || 'BLOCKED' : log.response_code}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {log.latency_ms}ms • {new Date(log.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {proxyStats && proxyStats.banned > 0 && (
          <div className="p-4 bg-red-500/10 border-t border-red-500/20">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-red-200 font-medium">
                  {proxyStats.banned} proxies currently banned
                </p>
                <p className="text-xs text-red-200/70">
                  Consider rotating IP ranges or increasing cooldown periods
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
