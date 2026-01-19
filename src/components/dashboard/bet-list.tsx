'use client';

import { useState, useEffect } from 'react';
import { Trash2, Edit, Check, X, TrendingUp, TrendingDown } from 'lucide-react';

interface Bet {
  id: string;
  bookmaker: string;
  sport: string;
  league: string | null;
  match_name: string;
  market: string;
  selection: string;
  odds: number;
  stake: number;
  outcome: 'pending' | 'won' | 'lost' | 'void' | 'cashout';
  profit: number | null;
  clv_percent: number | null;
  placed_at: string;
  settled_at: string | null;
  notes: string | null;
}

interface BetListProps {
  onUpdate?: () => void;
}

const OUTCOME_COLORS = {
  won: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  lost: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
  void: 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400',
  cashout: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
};

export function BetList({ onUpdate }: BetListProps) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    bookmaker: string;
    outcome: string;
  }>({
    bookmaker: 'all',
    outcome: 'all',
  });
  const [settlingBet, setSettlingBet] = useState<string | null>(null);

  useEffect(() => {
    fetchBets();
  }, [filter]);

  const fetchBets = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.bookmaker !== 'all') params.append('bookmaker', filter.bookmaker);
      if (filter.outcome !== 'all') params.append('outcome', filter.outcome);

      const response = await fetch(`/api/bets?${params}`);
      if (!response.ok) throw new Error('Failed to fetch bets');
      
      const data = await response.json();
      setBets(data.bets || []);
    } catch (error) {
      console.error('Error fetching bets:', error);
    } finally {
      setLoading(false);
    }
  };

  const settleBet = async (betId: string, outcome: 'won' | 'lost' | 'void') => {
    setSettlingBet(betId);
    try {
      const response = await fetch(`/api/bets/${betId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome })
      });

      if (!response.ok) throw new Error('Failed to settle bet');
      
      await fetchBets();
      onUpdate?.();
    } catch (error) {
      console.error('Error settling bet:', error);
      alert('Failed to settle bet');
    } finally {
      setSettlingBet(null);
    }
  };

  const deleteBet = async (betId: string) => {
    if (!confirm('Are you sure you want to delete this bet?')) return;

    try {
      const response = await fetch(`/api/bets/${betId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete bet');
      
      await fetchBets();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting bet:', error);
      alert('Failed to delete bet');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={filter.outcome}
          onChange={(e) => setFilter(prev => ({ ...prev, outcome: e.target.value }))}
          className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Outcomes</option>
          <option value="pending">Pending</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="void">Void</option>
          <option value="cashout">Cash Out</option>
        </select>

        <select
          value={filter.bookmaker}
          onChange={(e) => setFilter(prev => ({ ...prev, bookmaker: e.target.value }))}
          className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Bookmakers</option>
          <option value="bet9ja">Bet9ja</option>
          <option value="sportybet">SportyBet</option>
          <option value="betking">BetKing</option>
          <option value="1xbet">1xBet</option>
          <option value="betway">Betway</option>
        </select>
      </div>

      {/* Bets Table */}
      {bets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-neutral-500 dark:text-neutral-400">No bets found. Add your first bet to get started!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-100 dark:bg-neutral-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Match</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Selection</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Odds</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Stake</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Profit/Loss</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">CLV</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800">
              {bets.map((bet) => (
                <tr key={bet.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-neutral-900 dark:text-white">{bet.match_name}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {bet.league && `${bet.league} • `}{bet.bookmaker}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-neutral-900 dark:text-white">{bet.market}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">{bet.selection}</div>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-neutral-900 dark:text-white">
                    {bet.odds.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-900 dark:text-white">
                    {formatCurrency(bet.stake)}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium">
                    {bet.profit !== null ? (
                      <span className={bet.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {bet.profit >= 0 ? '+' : ''}{formatCurrency(bet.profit)}
                      </span>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${OUTCOME_COLORS[bet.outcome]}`}>
                      {bet.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {bet.clv_percent !== null ? (
                      <div className="flex items-center gap-1">
                        {bet.clv_percent > 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                        <span className={bet.clv_percent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {bet.clv_percent >= 0 ? '+' : ''}{bet.clv_percent.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-xs text-neutral-500 dark:text-neutral-400">
                    {formatDate(bet.placed_at)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {bet.outcome === 'pending' && (
                        <>
                          <button
                            onClick={() => settleBet(bet.id, 'won')}
                            disabled={settlingBet === bet.id}
                            className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-50"
                            title="Mark as Won"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => settleBet(bet.id, 'lost')}
                            disabled={settlingBet === bet.id}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                            title="Mark as Lost"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteBet(bet.id)}
                        className="p-1 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Delete Bet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
