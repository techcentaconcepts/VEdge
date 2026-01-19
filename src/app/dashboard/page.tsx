'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { BetEntryForm } from '@/components/dashboard/bet-entry-form';
import { BetList } from '@/components/dashboard/bet-list';
import { Target, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleBetUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Dashboard</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Track your betting performance and manage your bets
          </p>
        </div>
        <BetEntryForm key={refreshKey} onSuccess={handleBetUpdate} />
      </div>

      {/* Stats Cards */}
      <StatsCards key={refreshKey} />

      {/* Value Opportunities CTA */}
      <Link 
        href="/dashboard/opportunities"
        className="block bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
      >
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Value Opportunities</h3>
              <p className="text-white/90 text-sm mt-1">
                Discover +EV bets with sharp market alignment
              </p>
            </div>
          </div>
          <ArrowRight className="h-6 w-6" />
        </div>
      </Link>

      {/* Bets Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
          Your Bets
        </h2>
        <BetList key={refreshKey} onUpdate={handleBetUpdate} />
      </div>
    </div>
  );
}