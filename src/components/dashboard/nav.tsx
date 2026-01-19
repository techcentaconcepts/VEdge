'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/lib/database.types';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationCenter } from '@/components/notifications/notification-center';
import {
  TrendingUp,
  Bell,
  Settings,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Crown,
  Menu,
  X,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface DashboardNavProps {
  user: User;
  profile: Profile | null;
}

export function DashboardNav({ user, profile }: DashboardNavProps) {
  const router = useRouter();
  const supabase = createClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const tierColors = {
    free: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
    starter: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-200 dark:border-blue-900/30',
    pro: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-200 dark:border-amber-900/30',
  };

  const tier = profile?.subscription_tier || 'free';

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-40">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between max-w-[1920px] mx-auto">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/20">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white hidden sm:inline tracking-tight">Vantedge</span>
        </Link>

        {/* Right Side */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Theme Toggle */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          
          {/* Tier Badge */}
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${tierColors[tier]}`}>
            {tier === 'pro' && <Crown className="h-3.5 w-3.5" />}
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </div>

          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>

          {/* Notifications */}
          <NotificationCenter />

          {/* User Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="h-8 w-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                <UserIcon className="h-4 w-4" />
              </div>
              <ChevronDown className={`h-4 w-4 hidden sm:block transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {user.email}
                  </p>
                </div>
                
                <div className="p-2 space-y-1">
                  <div className="sm:hidden px-2 py-2">
                    <ThemeToggle />
                  </div>
                  
                  <Link 
                    href="/dashboard/settings"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Settings className="h-4 w-4 text-gray-500" />
                    Settings
                  </Link>
                  
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
