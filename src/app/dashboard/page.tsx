'use client';

import { useState } from 'react';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { BetEntryForm } from '@/components/dashboard/bet-entry-form';
import { BetList } from '@/components/dashboard/bet-list';

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