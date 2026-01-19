'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, Target, Award, BarChart3 } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface MarketStats {
  market: string;
  bets: number;
  profit: number;
  roi: number;
}

interface BookmakerStats {
  bookmaker: string;
  bets: number;
  avg_odds: number;
  clv: number;
}

export default function AnalyticsPage() {
  const [marketStats, setMarketStats] = useState<MarketStats[]>([]);
  const [bookmakerStats, setBookmakerStats] = useState<BookmakerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Fetch bets for analysis
    const { data: bets } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', user.id);

    if (bets) {
      // Group by market
      const marketMap = new Map<string, { bets: number; profit: number; staked: number }>();
      
      bets.forEach((bet: any) => {
        const current = marketMap.get(bet.bet_type) || { bets: 0, profit: 0, staked: 0 };
        current.bets++;
        current.staked += bet.stake;
        
        if (bet.status === 'won' && bet.actual_return) {
          current.profit += (bet.actual_return - bet.stake);
        } else if (bet.status === 'lost') {
          current.profit -= bet.stake;
        }
        
        marketMap.set(bet.bet_type, current);
      });

      const markets: MarketStats[] = Array.from(marketMap.entries()).map(([market, stats]) => ({
        market,
        bets: stats.bets,
        profit: stats.profit,
        roi: stats.staked > 0 ? (stats.profit / stats.staked) * 100 : 0
      }));

      setMarketStats(markets.sort((a, b) => b.roi - a.roi));

      // Group by bookmaker
      const bookmakerMap = new Map<string, { bets: number; total_odds: number; clv: number }>();
      
      bets.forEach((bet: any) => {
        const current = bookmakerMap.get(bet.bookmaker) || { bets: 0, total_odds: 0, clv: 0 };
        current.bets++;
        current.total_odds += bet.odds;
        current.clv += bet.edge_percent || 0;
        
        bookmakerMap.set(bet.bookmaker, current);
      });

      const bookmakers: BookmakerStats[] = Array.from(bookmakerMap.entries()).map(([bookmaker, stats]) => ({
        bookmaker,
        bets: stats.bets,
        avg_odds: stats.total_odds / stats.bets,
        clv: stats.clv / stats.bets
      }));

      setBookmakerStats(bookmakers.sort((a, b) => b.clv - a.clv));
    }

    setLoading(false);
  }

  const marketChartData = {
    labels: marketStats.slice(0, 5).map(m => m.market),
    datasets: [
      {
        label: 'ROI %',
        data: marketStats.slice(0, 5).map(m => m.roi),
        backgroundColor: marketStats.slice(0, 5).map(m => 
          m.roi >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
        ),
      }
    ]
  };

  const bookmakerChartData = {
    labels: bookmakerStats.map(b => b.bookmaker),
    datasets: [
      {
        label: 'Bets Placed',
        data: bookmakerStats.map(b => b.bets),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(249, 115, 22, 0.8)',
        ],
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Deep insights into your betting performance</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Markets</p>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-bold">{marketStats.length}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Best Market</p>
            <Award className="h-4 w-4 text-yellow-500" />
          </div>
          <p className="mt-2 text-lg font-bold">{marketStats[0]?.market || 'N/A'}</p>
          <p className="text-xs text-green-600">+{marketStats[0]?.roi.toFixed(1)}% ROI</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Bookmakers Used</p>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-bold">{bookmakerStats.length}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Avg CLV</p>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-green-600">
            +{(bookmakerStats.reduce((sum, b) => sum + b.clv, 0) / bookmakerStats.length || 0).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Market Performance */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Market Performance (Top 5)</h3>
          <div className="h-[300px]">
            {marketStats.length > 0 ? (
              <Bar
                data={marketChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      ticks: {
                        callback: function(value) {
                          return value + '%';
                        }
                      }
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Bookmaker Distribution */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Bookmaker Distribution</h3>
          <div className="h-[300px]">
            {bookmakerStats.length > 0 ? (
              <Doughnut
                data={bookmakerChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom' as const
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Market Stats Table */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Market Statistics</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">Market</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Bets</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Profit</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {marketStats.map((market, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm">{market.market}</td>
                    <td className="px-4 py-2 text-sm">{market.bets}</td>
                    <td className={`px-4 py-2 text-sm font-medium ${market.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {market.profit >= 0 ? '+' : ''}₦{market.profit.toLocaleString()}
                    </td>
                    <td className={`px-4 py-2 text-sm font-medium ${market.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {market.roi >= 0 ? '+' : ''}{market.roi.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bookmaker Stats Table */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Bookmaker Statistics</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">Bookmaker</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Bets</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Avg Odds</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">CLV</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bookmakerStats.map((bookmaker, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm font-medium">{bookmaker.bookmaker}</td>
                    <td className="px-4 py-2 text-sm">{bookmaker.bets}</td>
                    <td className="px-4 py-2 text-sm">{bookmaker.avg_odds.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-green-600 font-medium">
                      +{bookmaker.clv.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
