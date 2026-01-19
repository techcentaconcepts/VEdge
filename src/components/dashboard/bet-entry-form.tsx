'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface BetFormData {
  bookmaker: string;
  sport: string;
  league: string;
  match_name: string;
  market: string;
  selection: string;
  odds: string;
  stake: string;
  placed_at: string;
  notes: string;
}

interface BetEntryFormProps {
  onSuccess?: () => void;
}

const BOOKMAKERS = ['bet9ja', 'sportybet', 'betking', '1xbet', 'betway', 'other'];
const SPORTS = ['football', 'basketball', 'tennis', 'boxing', 'cricket', 'other'];
const MARKETS = ['1X2', 'Over/Under', 'BTTS', 'Double Chance', 'Handicap', 'Correct Score', 'Other'];

export function BetEntryForm({ onSuccess }: BetEntryFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<BetFormData>({
    bookmaker: 'bet9ja',
    sport: 'football',
    league: '',
    match_name: '',
    market: '1X2',
    selection: '',
    odds: '',
    stake: '',
    placed_at: new Date().toISOString().slice(0, 16),
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmaker: formData.bookmaker,
          sport: formData.sport,
          league: formData.league || null,
          match_name: formData.match_name,
          market: formData.market,
          selection: formData.selection,
          odds: parseFloat(formData.odds),
          stake: parseFloat(formData.stake),
          placed_at: formData.placed_at,
          notes: formData.notes || null,
          outcome: 'pending',
          synced_from: 'manual'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create bet');
      }

      // Reset form
      setFormData({
        bookmaker: 'bet9ja',
        sport: 'football',
        league: '',
        match_name: '',
        market: '1X2',
        selection: '',
        odds: '',
        stake: '',
        placed_at: new Date().toISOString().slice(0, 16),
        notes: ''
      });
      
      setIsOpen(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof BetFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const potentialReturn = formData.odds && formData.stake 
    ? (parseFloat(formData.odds) * parseFloat(formData.stake)).toFixed(2)
    : '0.00';

  const potentialProfit = formData.odds && formData.stake 
    ? ((parseFloat(formData.odds) * parseFloat(formData.stake)) - parseFloat(formData.stake)).toFixed(2)
    : '0.00';

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Bet
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Add New Bet</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Bookmaker *
              </label>
              <select
                value={formData.bookmaker}
                onChange={(e) => handleChange('bookmaker', e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {BOOKMAKERS.map(bm => (
                  <option key={bm} value={bm}>{bm.charAt(0).toUpperCase() + bm.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Sport *
              </label>
              <select
                value={formData.sport}
                onChange={(e) => handleChange('sport', e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {SPORTS.map(sport => (
                  <option key={sport} value={sport}>{sport.charAt(0).toUpperCase() + sport.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                League/Competition
              </label>
              <input
                type="text"
                value={formData.league}
                onChange={(e) => handleChange('league', e.target.value)}
                placeholder="e.g., Premier League"
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Match *
              </label>
              <input
                type="text"
                value={formData.match_name}
                onChange={(e) => handleChange('match_name', e.target.value)}
                placeholder="e.g., Arsenal vs Chelsea"
                required
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Market *
              </label>
              <select
                value={formData.market}
                onChange={(e) => handleChange('market', e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {MARKETS.map(market => (
                  <option key={market} value={market}>{market}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Selection *
              </label>
              <input
                type="text"
                value={formData.selection}
                onChange={(e) => handleChange('selection', e.target.value)}
                placeholder="e.g., Arsenal Win"
                required
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Odds *
              </label>
              <input
                type="number"
                step="0.01"
                min="1.01"
                value={formData.odds}
                onChange={(e) => handleChange('odds', e.target.value)}
                placeholder="e.g., 2.50"
                required
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Stake (₦) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.stake}
                onChange={(e) => handleChange('stake', e.target.value)}
                placeholder="e.g., 5000"
                required
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Placed At *
              </label>
              <input
                type="datetime-local"
                value={formData.placed_at}
                onChange={(e) => handleChange('placed_at', e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Optional notes about this bet"
                rows={3}
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {formData.odds && formData.stake && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-neutral-600 dark:text-neutral-400">Potential Return</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₦{potentialReturn}</p>
                </div>
                <div>
                  <p className="text-neutral-600 dark:text-neutral-400">Potential Profit</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₦{potentialProfit}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Adding...' : 'Add Bet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
