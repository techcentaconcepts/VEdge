'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Bell, X, TrendingUp, Clock } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'opportunity' | 'alert' | 'info';
  timestamp: string;
  read: boolean;
  data?: any;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadNotifications();

    // Subscribe to new opportunities (real-time)
    const channel = supabase
      .channel('opportunities')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'value_opportunities',
          filter: 'best_edge_percent=gte.5',
        },
        (payload) => {
          const opp = payload.new;
          const notification: Notification = {
            id: opp.match_id,
            title: 'New Value Opportunity!',
            message: `${opp.match_name}: ${opp.best_edge_percent}% edge on ${opp.best_edge_market}`,
            type: 'opportunity',
            timestamp: new Date().toISOString(),
            read: false,
            data: opp,
          };
          
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/logo.png',
              tag: notification.id,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function loadNotifications() {
    // Load recent alert logs
    const { data: alerts } = await supabase
      .from('alert_log')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(20);

    if (alerts) {
      const notifs = alerts.map(alert => ({
        id: alert.id,
        title: 'Alert Sent',
        message: `Alert sent via ${alert.channel}`,
        type: 'alert' as const,
        timestamp: alert.sent_at,
        read: alert.clicked_at !== null,
      }));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }
  }

  async function markAsRead(id: string) {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Update in database if it's an alert
    await supabase
      .from('alert_log')
      .update({ clicked_at: new Date().toISOString() })
      .eq('id', id);
  }

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => {
          setShowPanel(!showPanel);
          requestNotificationPermission();
        }}
        className="relative p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />
          <div className="absolute right-0 mt-2 w-96 max-h-[600px] bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden z-50">
            {/* Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Notifications
                </h3>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[500px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No notifications yet</p>
                  <p className="text-sm mt-1">
                    You'll be notified of new value opportunities
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer ${
                      !notif.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                    }`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        notif.type === 'opportunity'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                          : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      }`}>
                        {notif.type === 'opportunity' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 dark:text-white text-sm">
                          {notif.title}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-500 mt-2">
                          <Clock className="w-3 h-3" />
                          {new Date(notif.timestamp).toLocaleString()}
                        </div>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  onClick={() => {
                    setNotifications([]);
                    setUnreadCount(0);
                  }}
                  className="w-full text-sm text-center text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
