'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface Bet {
  id: string;
  match_name: string;
  bet_type: string;
  odds: number;
  stake: number;
  potential_return: number;
  status: 'pending' | 'won' | 'lost' | 'void';
  placed_at: string;
  settled_at: string | null;
  actual_return: number | null;
  bookmaker: string;
  edge_percent: number | null;
}

export default function BetHistoryPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [stats, setStats] = useState({
    total_bets: 0,
    total_staked: 0,
    total_returned: 0,
    profit_loss: 0,
    roi: 0,
    win_rate: 0,
    avg_odds: 0,
    clv: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'won' | 'lost'>('all');

  useEffect(() => {
    fetchBets();
    fetchStats();
  }, [filter]);

  async function fetchBets() {
    const supabase = createClient();
    
    let query = supabase
      .from('bets')
      .select('*')
      .order('placed_at', { ascending: false });
    
    if (filter !== 'all') {
      query = query.eq('status', filter);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching bets:', error);
    } else {
      setBets(data || []);
    }
    
    setLoading(false);
  }

  async function fetchStats() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;
    
    const { data, error } = await supabase.rpc('calculate_user_stats', {
      p_user_id: user.id
    });
    
    if (error) {
      console.error('Error fetching stats:', error);
    } else if (data && data.length > 0) {
      setStats(data[0]);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'won':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'lost':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'won':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case 'lost':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200`;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bet History</h1>
        <p className="text-muted-foreground">Track your betting performance and returns</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Bets</p>
          </div>
          <p className="mt-2 text-3xl font-bold">{stats.total_bets || 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Win Rate: {(stats.win_rate || 0).toFixed(1)}%
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Staked</p>
          </div>
          <p className="mt-2 text-3xl font-bold">₦{(stats.total_staked || 0).toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Avg Stake: ₦{stats.total_bets > 0 ? ((stats.total_staked || 0) / stats.total_bets).toFixed(2) : 0}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Profit/Loss</p>
            {(stats.profit_loss || 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </div>
          <p className={`mt-2 text-3xl font-bold ${(stats.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(stats.profit_loss || 0) > 0 ? '+' : ''}₦{(stats.profit_loss || 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ROI: {(stats.roi || 0).toFixed(1)}%
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">CLV</p>
          </div>
          <p className="mt-2 text-3xl font-bold">{(stats.clv || 0).toFixed(2)}%</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Avg Odds: {(stats.avg_odds || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg ${filter === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('won')}
          className={`px-4 py-2 rounded-lg ${filter === 'won' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
        >
          Won
        </button>
        <button
          onClick={() => setFilter('lost')}
          className={`px-4 py-2 rounded-lg ${filter === 'lost' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
        >
          Lost
        </button>
      </div>

      {/* Bets Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Match</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Bet Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Odds</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Stake</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Potential</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Return</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : bets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No bets found
                  </td>
                </tr>
              ) : (
                bets.map((bet) => (
                  <tr key={bet.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{bet.match_name}</p>
                        <p className="text-xs text-muted-foreground">{bet.bookmaker}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{bet.bet_type}</span>
                      {bet.edge_percent && (
                        <span className="ml-2 text-xs text-green-600">+{bet.edge_percent.toFixed(1)}%</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{bet.odds.toFixed(2)}</td>
                    <td className="px-4 py-3">₦{bet.stake.toLocaleString()}</td>
                    <td className="px-4 py-3">₦{bet.potential_return.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {bet.actual_return !== null ? (
                        <span className={bet.actual_return > bet.stake ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          ₦{bet.actual_return.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(bet.status)}
                        <span className={getStatusBadge(bet.status)}>
                          {bet.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {format(new Date(bet.placed_at), 'MMM dd, yyyy')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
