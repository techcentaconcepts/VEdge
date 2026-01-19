'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import {
  LayoutDashboard,
  TrendingUp,
  Target,
  History,
  Wallet,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/opportunities', label: 'Opportunities', icon: Target },
  { href: '/dashboard/bets', label: 'Bet History', icon: History },
  { href: '/dashboard/bankroll', label: 'Bankroll', icon: Wallet },
  { href: '/dashboard/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/dashboard/alerts', label: 'Alerts', icon: Bell },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-30 ${collapsed ? 'w-16' : 'w-64'}`}>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={collapsed ? item.label : ''}
              >
                <item.icon className={`h-5 w-5 flex-shrink-0 transition-colors ${isActive ? 'text-brand-600 dark:text-brand-400' : 'group-hover:text-gray-900 dark:group-hover:text-white'}`} />
                {!collapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group w-full text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10`}
            title={collapsed ? "Logout" : ""}
          >
            <LogOut className={`h-5 w-5 flex-shrink-0 transition-colors group-hover:text-red-600 dark:group-hover:text-red-400`} />
            {!collapsed && <span className="font-medium whitespace-nowrap">Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-4 border-t border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center justify-center transition-colors bg-gray-50 dark:bg-gray-900/50"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Collapse</span>
            </div>
          )}
        </button>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 pb-safe">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
