'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface BankrollEntry {
  date: string;
  balance: number;
  profit_loss: number;
}

export default function BankrollPage() {
  const [balance, setBalance] = useState(0);
  const [initialBalance, setInitialBalance] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [roi, setRoi] = useState(0);
  const [history, setHistory] = useState<BankrollEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBankrollData();
  }, []);

  async function fetchBankrollData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Fetch current balance from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('bankroll, initial_bankroll')
      .eq('id', user.id)
      .single();

    if (profile) {
      setBalance(profile.bankroll || 0);
      setInitialBalance(profile.initial_bankroll || 0);
      const profit = (profile.bankroll || 0) - (profile.initial_bankroll || 0);
      setTotalProfit(profit);
      setRoi(profile.initial_bankroll > 0 ? (profit / profile.initial_bankroll) * 100 : 0);
    }

    // Fetch historical data (simulate with bet history)
    const { data: bets } = await supabase
      .from('bets')
      .select('placed_at, stake, actual_return, status')
      .eq('user_id', user.id)
      .order('placed_at', { ascending: true });

    if (bets) {
      let runningBalance = profile?.initial_bankroll || 0;
      const entries: BankrollEntry[] = [];
      
      bets.forEach((bet: any) => {
        if (bet.status === 'won' && bet.actual_return) {
          runningBalance += (bet.actual_return - bet.stake);
        } else if (bet.status === 'lost') {
          runningBalance -= bet.stake;
        }
        
        entries.push({
          date: new Date(bet.placed_at).toLocaleDateString(),
          balance: runningBalance,
          profit_loss: runningBalance - (profile?.initial_bankroll || 0)
        });
      });
      
      setHistory(entries);
    }

    setLoading(false);
  }

  const chartData = {
    labels: history.map(h => h.date),
    datasets: [
      {
        label: 'Bankroll',
        data: history.map(h => h.balance),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value: any) {
            return '₦' + value.toLocaleString();
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bankroll Management</h1>
        <p className="text-muted-foreground">Track and manage your betting capital</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-bold">₦{balance.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Available for betting
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Initial Balance</p>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-bold">₦{initialBalance.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Starting capital
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Profit/Loss</p>
            {totalProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </div>
          <p className={`mt-2 text-3xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalProfit >= 0 ? '+' : ''}₦{totalProfit.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            All-time performance
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">ROI</p>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className={`mt-2 text-3xl font-bold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Return on investment
          </p>
        </div>
      </div>

      {/* Bankroll Chart */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Bankroll History</h3>
        <div className="h-[400px]">
          {history.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No betting history yet
            </div>
          )}
        </div>
      </div>

      {/* Bankroll Guidelines */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Bankroll Guidelines</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Conservative (1-2%)</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Recommended stake: ₦{(balance * 0.015).toLocaleString()}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Best for beginners and risk-averse bettors
            </p>
          </div>

          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Moderate (3-5%)</h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              Recommended stake: ₦{(balance * 0.04).toLocaleString()}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Balanced approach for experienced bettors
            </p>
          </div>

          <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950">
            <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">Aggressive (6-10%)</h4>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Recommended stake: ₦{(balance * 0.08).toLocaleString()}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              Higher risk - only for professionals
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
