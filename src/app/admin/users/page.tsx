'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  Users,
  Crown,
  TrendingUp,
  TrendingDown,
  Gift,
  Search,
  Filter,
  MoreVertical,
  Mail,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Settings,
  XCircle,
  RefreshCw,
  Download,
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: string;
  created_at: string;
  telegram_username: string | null;
}

interface CLVLeader {
  user_id: string;
  email: string;
  full_name: string | null;
  subscription_tier: string;
  total_bets: number;
  avg_clv: number;
  positive_clv_rate: number;
  total_edge_captured: number;
}

interface ChurnMetrics {
  newSubscriptions: number;
  churned: number;
  upgrades: number;
  downgrades: number;
  netChange: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clvLeaders, setClvLeaders] = useState<CLVLeader[]>([]);
  const [churnMetrics, setChurnMetrics] = useState<ChurnMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftDuration, setGiftDuration] = useState(1);
  const [giftTier, setGiftTier] = useState('pro');
  const [giftReason, setGiftReason] = useState('');
  const [gifting, setGifting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Load users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersData) setUsers(usersData);

      // Load CLV leaderboard
      const { data: clvData } = await supabase.rpc('get_clv_leaderboard', {
        p_days: 30,
        p_limit: 10
      });

      if (clvData) setClvLeaders(clvData);

      // Load churn metrics (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: eventsData } = await supabase
        .from('subscription_events')
        .select('event_type')
        .gte('created_at', thirtyDaysAgo);

      if (eventsData) {
        const newSubs = eventsData.filter(e => e.event_type === 'subscribed').length;
        const churned = eventsData.filter(e => e.event_type === 'canceled').length;
        const upgrades = eventsData.filter(e => e.event_type === 'upgraded').length;
        const downgrades = eventsData.filter(e => e.event_type === 'downgraded').length;

        setChurnMetrics({
          newSubscriptions: newSubs,
          churned,
          upgrades,
          downgrades,
          netChange: newSubs + upgrades - churned - downgrades,
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function giftSubscription() {
    if (!selectedUser) return;
    setGifting(true);

    try {
      // Update user's subscription tier
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ subscription_tier: giftTier })
        .eq('id', selectedUser.id);

      if (updateError) throw updateError;

      // Log the gift event
      const { error: eventError } = await supabase
        .from('subscription_events')
        .insert({
          user_id: selectedUser.id,
          event_type: 'gifted',
          from_tier: selectedUser.subscription_tier,
          to_tier: giftTier,
          reason: giftReason,
          metadata: { duration_months: giftDuration }
        });

      if (eventError) throw eventError;

      // Refresh data
      await loadData();
      setShowGiftModal(false);
      setSelectedUser(null);
      setGiftReason('');
    } catch (error) {
      console.error('Failed to gift subscription:', error);
      alert('Failed to gift subscription. Make sure you have admin permissions.');
    } finally {
      setGifting(false);
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === 'all' || user.subscription_tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const tierCounts = {
    all: users.length,
    free: users.filter(u => u.subscription_tier === 'free').length,
    starter: users.filter(u => u.subscription_tier === 'starter').length,
    pro: users.filter(u => u.subscription_tier === 'pro').length,
  };

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
            <Users className="w-7 h-7 text-emerald-500" />
            User Management
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Manage subscriptions, track CLV performance, and monitor churn
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{users.length}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Users</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{churnMetrics?.newSubscriptions || 0}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">New (30d)</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{churnMetrics?.churned || 0}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Churned (30d)</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-lg">
              <Crown className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{churnMetrics?.upgrades || 0}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Upgrades (30d)</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${(churnMetrics?.netChange || 0) >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}>
              {(churnMetrics?.netChange || 0) >= 0 
                ? <TrendingUp className="w-5 h-5 text-emerald-500" />
                : <TrendingDown className="w-5 h-5 text-red-500" />
              }
            </div>
            <div>
              <p className={`text-2xl font-bold ${(churnMetrics?.netChange || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {(churnMetrics?.netChange || 0) >= 0 ? '+' : ''}{churnMetrics?.netChange || 0}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Net Change</p>
            </div>
          </div>
        </div>
      </div>

      {/* CLV Leaderboard */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            CLV Leaderboard
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Top performers beating the closing line (Last 30 days)
          </p>
        </div>

        {clvLeaders.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            No CLV data yet. Leaders will appear as users place bets with CLV tracking.
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {clvLeaders.map((leader, index) => (
              <div key={leader.user_id} className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-amber-500 text-black' :
                    index === 1 ? 'bg-neutral-400 text-black' :
                    index === 2 ? 'bg-amber-700 text-white' :
                    'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">

                      {leader.full_name || leader.email}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{leader.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      +{leader.avg_clv?.toFixed(2) || 0}%
                    </p>
                    <p className="text-xs text-neutral-500">Avg CLV</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {leader.positive_clv_rate?.toFixed(1) || 0}%
                    </p>
                    <p className="text-xs text-neutral-500">Beat Rate</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{leader.total_bets}</p>
                    <p className="text-xs text-neutral-500">Bets</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    leader.subscription_tier === 'pro'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
                      : leader.subscription_tier === 'starter'
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500'
                      : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                  }`}>
                    {leader.subscription_tier}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User List */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">All Users</h2>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="pl-9 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 w-64"
                />
              </div>

              {/* Tier Filter */}
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
                {(['all', 'free', 'starter', 'pro'] as const).map(tier => (
                  <button
                    key={tier}
                    onClick={() => setTierFilter(tier)}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                      tierFilter === tier
                        ? 'bg-emerald-500 text-white'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {tier.charAt(0).toUpperCase() + tier.slice(1)} ({tierCounts[tier]})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-neutral-200 dark:divide-neutral-800 max-h-96 overflow-y-auto">
          {filteredUsers.map((user) => (
            <div key={user.id} className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-neutral-700 dark:text-white">
                    {user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {user.full_name || user.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  user.subscription_tier === 'pro'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
                    : user.subscription_tier === 'starter'
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500'
                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                }`}>
                  {user.subscription_tier}
                </span>
                <span className="text-xs text-neutral-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
                
                <div className="relative">
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setShowGiftModal(true);
                    }}
                    className="p-2 text-neutral-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                    title="Manage User"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manage User Modal (Replaces Gift Modal) */}
      {showGiftModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-500" />
                Manage User
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {selectedUser.full_name} ({selectedUser.email})
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Subscription Tier
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['free', 'starter', 'pro', 'custom_pro'].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setGiftTier(tier)}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        giftTier === tier
                          ? 'bg-emerald-500 text-white'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {tier === 'custom_pro' ? 'Custom Pro' : tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Notes / Reason
                </label>
                <textarea
                  value={giftReason}
                  onChange={(e) => setGiftReason(e.target.value)}
                  placeholder="Reason for change..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowGiftModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={giftSubscription}
                disabled={gifting}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {gifting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
