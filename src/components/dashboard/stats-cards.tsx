'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, Award, Clock } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface UserStats {
  total_bets: number;
  total_staked: number;
  total_profit: number;
  roi: number;
  win_rate: number;
  avg_clv: number;
  avg_odds: number;
  pending_count: number;
  won_count: number;
  lost_count: number;
  last_bet_date: string | null;
}

export function StatsCards() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .rpc('calculate_user_stats', { p_user_id: user.id });

      if (error) throw error;
      
      // The function returns JSON, parse it if it's a string
      const statsData = typeof data === 'string' ? JSON.parse(data) : data;
      setStats(statsData as UserStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 animate-pulse">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-20 mb-4"></div>
            <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-24 mb-2"></div>
            <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
        <p className="text-yellow-700 dark:text-yellow-400">No betting data available. Add your first bet to see stats!</p>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Profit/Loss',
      value: formatCurrency(stats.total_profit),
      change: stats.roi,
      changeLabel: `${formatPercent(stats.roi)} ROI`,
      icon: DollarSign,
      positive: stats.total_profit >= 0,
    },
    {
      title: 'Win Rate',
      value: `${stats.win_rate.toFixed(1)}%`,
      change: null,
      changeLabel: `${stats.won_count}W / ${stats.lost_count}L`,
      icon: Target,
      positive: stats.win_rate >= 50,
    },
    {
      title: 'CLV (Closing Line Value)',
      value: formatPercent(stats.avg_clv),
      change: stats.avg_clv,
      changeLabel: stats.avg_clv > 0 ? 'Beating closing odds' : 'Below closing odds',
      icon: Award,
      positive: stats.avg_clv >= 0,
    },
    {
      title: 'Total Staked',
      value: formatCurrency(stats.total_staked),
      change: null,
      changeLabel: `${stats.total_bets} bets placed`,
      icon: TrendingUp,
      positive: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                {card.title}
              </span>
              <div className={`p-2 rounded-lg ${
                card.positive 
                  ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mb-2">
              <p className={`text-2xl font-bold ${
                card.positive
                  ? 'text-neutral-900 dark:text-white'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {card.value}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {card.change !== null && (
                <span className={`flex items-center text-sm font-medium ${
                  card.change >= 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {card.change >= 0 ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                </span>
              )}
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {card.changeLabel}
              </span>
            </div>
          </div>
        );
      })}

      {/* Additional info card */}
      {stats.pending_count > 0 && (
        <div className="md:col-span-2 lg:col-span-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {stats.pending_count} pending bet{stats.pending_count !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Settle your pending bets to see updated statistics
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
