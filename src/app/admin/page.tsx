'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  Users,
  CreditCard,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  newUsersToday: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadStats() {
      try {
        // Get total users
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Get active subscriptions (non-free)
        const { count: activeSubscriptions } = await supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .neq('tier', 'free')
          .eq('status', 'active');

        // Get users created today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: newUsersToday } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());

        // Get recent users
        const { data: recent } = await supabase
          .from('profiles')
          .select('id, email, full_name, subscription_tier, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        setStats({
          totalUsers: totalUsers || 0,
          activeSubscriptions: activeSubscriptions || 0,
          monthlyRevenue: (activeSubscriptions || 0) * 5000, // Rough estimate
          newUsersToday: newUsersToday || 0,
        });
        setRecentUsers(recent || []);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [supabase]);

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      change: '+12%',
      positive: true,
    },
    {
      label: 'Active Subscriptions',
      value: stats?.activeSubscriptions || 0,
      icon: CreditCard,
      change: '+8%',
      positive: true,
    },
    {
      label: 'Monthly Revenue',
      value: `₦${(stats?.monthlyRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      change: '+15%',
      positive: true,
    },
    {
      label: 'New Users Today',
      value: stats?.newUsersToday || 0,
      icon: TrendingUp,
      change: stats?.newUsersToday ? '+' + stats.newUsersToday : '0',
      positive: (stats?.newUsersToday || 0) > 0,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-neutral-400 mt-1">Overview of your platform metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-neutral-800 rounded-lg">
                <stat.icon className="w-5 h-5 text-emerald-500" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                stat.positive ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {stat.positive ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {stat.change}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-neutral-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Users */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl">
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">Recent Users</h2>
        </div>
        <div className="divide-y divide-neutral-800">
          {recentUsers.length === 0 ? (
            <div className="p-6 text-center text-neutral-400">
              No users yet
            </div>
          ) : (
            recentUsers.map((user) => (
              <div key={user.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {user.full_name || user.email}
                    </p>
                    <p className="text-xs text-neutral-400">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.subscription_tier === 'pro'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : user.subscription_tier === 'starter'
                      ? 'bg-blue-500/10 text-blue-500'
                      : 'bg-neutral-700 text-neutral-300'
                  }`}>
                    {user.subscription_tier}
                  </span>
                  <p className="text-xs text-neutral-500 mt-1">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/admin/plans"
          className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-emerald-500/50 transition-colors group"
        >
          <h3 className="font-semibold text-white group-hover:text-emerald-500 transition-colors">
            Manage Plans
          </h3>
          <p className="text-sm text-neutral-400 mt-1">
            Configure subscription tiers and pricing
          </p>
        </a>
        <a
          href="/admin/payments"
          className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-emerald-500/50 transition-colors group"
        >
          <h3 className="font-semibold text-white group-hover:text-emerald-500 transition-colors">
            Payment Gateways
          </h3>
          <p className="text-sm text-neutral-400 mt-1">
            Configure Paystack, Stripe, Flutterwave
          </p>
        </a>
        <a
          href="/admin/settings"
          className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-emerald-500/50 transition-colors group"
        >
          <h3 className="font-semibold text-white group-hover:text-emerald-500 transition-colors">
            Site Settings
          </h3>
          <p className="text-sm text-neutral-400 mt-1">
            General configuration and preferences
          </p>
        </a>
      </div>
    </div>
  );
}
