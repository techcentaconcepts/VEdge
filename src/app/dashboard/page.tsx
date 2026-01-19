import { createClient } from '@/lib/supabase/server';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Percent, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user stats
  const { data: stats } = await supabase
    .rpc('calculate_user_stats', { p_user_id: user?.id });

  // Fetch recent bets
  const { data: recentBets } = await supabase
    .from('bets')
    .select('*')
    .eq('user_id', user?.id)
    .order('placed_at', { ascending: false })
    .limit(5);

  // Fetch active opportunities
  const { data: opportunities } = await supabase
    .rpc('get_active_opportunities', { p_min_edge: 3, p_limit: 5 });

  // Demo data if no real data exists
  const displayStats = stats || {
    total_bets: 0,
    total_staked: 0,
    total_profit: 0,
    roi: 0,
    win_rate: 0,
    avg_clv: 0,
    pending_bets: 0,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      label: 'Total Profit',
      value: formatCurrency(displayStats.total_profit || 0),
      change: displayStats.roi > 0 ? `+${displayStats.roi.toFixed(1)}% ROI` : `${displayStats.roi?.toFixed(1) || 0}% ROI`,
      trend: displayStats.total_profit >= 0 ? 'up' : 'down',
      icon: DollarSign,
    },
    {
      label: 'Win Rate',
      value: `${(displayStats.win_rate || 0).toFixed(1)}%`,
      change: `${displayStats.total_bets || 0} total bets`,
      trend: displayStats.win_rate >= 50 ? 'up' : 'down',
      icon: Target,
    },
    {
      label: 'Avg CLV',
      value: `${(displayStats.avg_clv || 0).toFixed(2)}%`,
      change: displayStats.avg_clv > 0 ? 'Beating closing line' : 'Below closing line',
      trend: displayStats.avg_clv >= 0 ? 'up' : 'down',
      icon: Percent,
    },
    {
      label: 'Pending Bets',
      value: displayStats.pending_bets || 0,
      change: formatCurrency(displayStats.total_staked || 0) + ' at stake',
      trend: 'neutral',
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Track your betting performance and find value opportunities</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</h3>
              </div>
              <div className={`p-2 rounded-lg ${
                stat.trend === 'up' ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400' : 
                stat.trend === 'down' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 
                'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              stat.trend === 'up' ? 'text-green-500' :
              stat.trend === 'down' ? 'text-red-500' :
              'text-neutral-400'
            }`}>
              {stat.trend === 'up' && <ArrowUpRight className="h-4 w-4" />}
              {stat.trend === 'down' && <ArrowDownRight className="h-4 w-4" />}
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Opportunities */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Value Opportunities
            </h2>
            <Link href="/dashboard/opportunities" className="text-sm text-green-500 hover:text-green-400">
              View all →
            </Link>
          </div>
          
          {opportunities && opportunities.length > 0 ? (
            <div className="space-y-3">
              {opportunities.map((opp: any) => (
                <div key={opp.id} className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{opp.match_name}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {opp.market} • {opp.selection}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      opp.edge_percent >= 10 ? 'edge-high' :
                      opp.edge_percent >= 5 ? 'edge-medium' :
                      'edge-low'
                    }`}>
                      +{opp.edge_percent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-neutral-400">
                    <span>{opp.soft_bookmaker} @ {opp.soft_odds}</span>
                    <span>vs Pinnacle @ {opp.sharp_odds}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-400 text-sm">No active opportunities</p>
              <p className="text-neutral-500 text-xs mt-1">Check back soon or lower your edge threshold</p>
            </div>
          )}
        </div>

        {/* Recent Bets */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Bets</h2>
            <Link href="/dashboard/bets" className="text-sm text-green-500 hover:text-green-400">
              View all →
            </Link>
          </div>
          
          {recentBets && recentBets.length > 0 ? (
            <div className="space-y-3">
              {recentBets.map((bet) => (
                <div key={bet.id} className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{bet.match_name}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {bet.market} • {bet.selection}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      bet.outcome === 'won' ? 'status-won' :
                      bet.outcome === 'lost' ? 'status-lost' :
                      'status-pending'
                    }`}>
                      {bet.outcome || 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-neutral-400">
                      {bet.bookmaker} @ {bet.odds}
                    </span>
                    <span className={bet.profit_loss && bet.profit_loss > 0 ? 'text-green-500' : bet.profit_loss && bet.profit_loss < 0 ? 'text-red-500' : 'text-neutral-400'}>
                      {bet.profit_loss ? (bet.profit_loss > 0 ? '+' : '') + formatCurrency(bet.profit_loss) : formatCurrency(bet.stake) + ' staked'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-400 text-sm">No bets tracked yet</p>
              <p className="text-neutral-500 text-xs mt-1">Install the extension to sync your bets automatically</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link 
            href="/dashboard/bets/add"
            className="p-4 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors"
          >
            <p className="font-medium text-white">Add Manual Bet</p>
            <p className="text-xs text-neutral-400 mt-1">Track a bet not captured by extension</p>
          </Link>
          <a 
            href="https://chrome.google.com/webstore" 
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors"
          >
            <p className="font-medium text-white">Install Extension</p>
            <p className="text-xs text-neutral-400 mt-1">Auto-sync bets from Bet9ja, SportyBet</p>
          </a>
          <Link 
            href="/dashboard/settings#telegram"
            className="p-4 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors"
          >
            <p className="font-medium text-white">Connect Telegram</p>
            <p className="text-xs text-neutral-400 mt-1">Get instant value alerts</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
