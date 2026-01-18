'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/lib/database.types';
import { createClient } from '@/lib/supabase/client';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    free: 'text-neutral-400 bg-neutral-800',
    starter: 'text-blue-400 bg-blue-500/10',
    pro: 'text-yellow-400 bg-yellow-500/10',
  };

  const tier = profile?.subscription_tier || 'free';

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800 z-50">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-green-500" />
          <span className="text-xl font-bold text-white hidden sm:inline">Vantedge</span>
        </Link>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Tier Badge */}
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${tierColors[tier]}`}>
            {tier === 'pro' && <Crown className="h-3.5 w-3.5" />}
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-green-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
            >
              <div className="h-8 w-8 bg-neutral-700 rounded-full flex items-center justify-center">
                <UserIcon className="h-4 w-4" />
              </div>
              <ChevronDown className={`h-4 w-4 hidden sm:block transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg overflow-hidden">
                <div className="p-4 border-b border-neutral-800">
                  <p className="text-sm font-medium text-white truncate">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                </div>
                
                <div className="p-2">
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  
                  {tier !== 'pro' && (
                    <Link
                      href="/dashboard/upgrade"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/10 rounded-lg"
                    >
                      <Crown className="h-4 w-4" />
                      Upgrade to Pro
                    </Link>
                  )}
                </div>
                
                <div className="p-2 border-t border-neutral-800">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-neutral-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
    </header>
  );
}
