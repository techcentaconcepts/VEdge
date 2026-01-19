'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  LayoutDashboard,
  CreditCard,
  Package,
  Users,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Server,
  BarChart3,
  Bell,
  Globe,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/scrapers', label: 'Scraper Health', icon: Server, badge: 'live' },
  { href: '/admin/analytics', label: 'Edge Analytics', icon: BarChart3 },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/plans', label: 'Subscription Plans', icon: Package },
  { href: '/admin/payments', label: 'Payment Gateways', icon: CreditCard },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function checkAdminAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login?redirect=/admin');
        return;
      }

      // Check if user is admin using function that bypasses RLS
      const { data: adminCheck, error } = await supabase
        .rpc('is_user_admin');

      if (error || !adminCheck || adminCheck.length === 0) {
        // Not an admin, redirect to dashboard
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);
      setAdminRole(adminCheck[0].role);
    }

    checkAdminAccess();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-neutral-900 border-b border-neutral-800 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-500" />
          <span className="font-bold text-white">Admin Panel</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-neutral-400 hover:text-white"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-neutral-900 border-r border-neutral-800 z-40 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="p-6 border-b border-neutral-800 hidden lg:block">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-500" />
            <span className="font-bold text-white">Admin Panel</span>
          </div>
          <p className="text-xs text-neutral-500 mt-1 capitalize">{adminRole} Access</p>
        </div>

        <nav className="p-4 mt-16 lg:mt-0">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {'badge' in item && item.badge && (
                      <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded uppercase">
                        {item.badge}
                      </span>
                    )}
                    {isActive && !('badge' in item) && <ChevronRight className="w-4 h-4" />}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 pt-4 border-t border-neutral-800">
            <div className="px-3 mb-3">
              <ThemeToggle />
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-sm font-medium">Back to App</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors mt-1"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
