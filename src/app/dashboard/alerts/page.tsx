'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bell, Mail, MessageSquare, Check, X } from 'lucide-react';

interface AlertSettings {
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  min_edge_threshold: number;
  favorite_leagues: string[];
  favorite_bookmakers: string[];
}

export default function AlertsPage() {
  const [settings, setSettings] = useState<AlertSettings>({
    email_enabled: true,
    push_enabled: true,
    sms_enabled: false,
    min_edge_threshold: 5,
    favorite_leagues: [],
    favorite_bookmakers: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const leagues = [
    'Premier League',
    'La Liga',
    'Serie A',
    'Bundesliga',
    'Ligue 1',
    'UEFA Champions League',
    'UEFA Europa League',
    'NPFL'
  ];

  const bookmakers = [
    'Bet9ja',
    'SportyBet',
    'BetKing',
    '1xBet',
    'Betway',
    'NairaBet',
    '22Bet'
  ];

  useEffect(() => {
    fetchSettings();
    requestNotificationPermission();
  }, []);

  async function fetchSettings() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('alert_settings')
      .eq('id', user.id)
      .single();

    if (profile?.alert_settings) {
      setSettings(profile.alert_settings);
    }

    setLoading(false);
  }

  async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  async function saveSettings() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ alert_settings: settings })
      .eq('id', user.id);

    if (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } else {
      alert('Settings saved successfully!');
    }

    setSaving(false);
  }

  const toggleLeague = (league: string) => {
    setSettings(prev => ({
      ...prev,
      favorite_leagues: prev.favorite_leagues.includes(league)
        ? prev.favorite_leagues.filter(l => l !== league)
        : [...prev.favorite_leagues, league]
    }));
  };

  const toggleBookmaker = (bookmaker: string) => {
    setSettings(prev => ({
      ...prev,
      favorite_bookmakers: prev.favorite_bookmakers.includes(bookmaker)
        ? prev.favorite_bookmakers.filter(b => b !== bookmaker)
        : [...prev.favorite_bookmakers, bookmaker]
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Alert Settings</h1>
        <p className="text-muted-foreground">Configure how you want to receive value bet notifications</p>
      </div>

      {/* Notification Channels */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Notification Channels</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Browser Push Notifications</p>
                <p className="text-sm text-muted-foreground">Get instant alerts in your browser</p>
              </div>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, push_enabled: !prev.push_enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.push_enabled ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.push_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive alerts via email</p>
              </div>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, email_enabled: !prev.email_enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.email_enabled ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.email_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-muted-foreground">Get alerts via text message (Pro only)</p>
              </div>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, sms_enabled: !prev.sms_enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.sms_enabled ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.sms_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Edge Threshold */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Minimum Edge Threshold</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Only receive alerts for opportunities with edge above this threshold
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={settings.min_edge_threshold}
            onChange={(e) => setSettings(prev => ({ ...prev, min_edge_threshold: parseFloat(e.target.value) }))}
            className="flex-1"
          />
          <span className="text-2xl font-bold text-primary w-20 text-right">
            {settings.min_edge_threshold}%
          </span>
        </div>
      </div>

      {/* Favorite Leagues */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Favorite Leagues</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Get priority alerts for these leagues
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map(league => (
            <button
              key={league}
              onClick={() => toggleLeague(league)}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                settings.favorite_leagues.includes(league)
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'hover:bg-muted/50'
              }`}
            >
              <span className="text-sm font-medium">{league}</span>
              {settings.favorite_leagues.includes(league) && (
                <Check className="h-4 w-4" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Favorite Bookmakers */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Favorite Bookmakers</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Get alerts only from these bookmakers
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {bookmakers.map(bookmaker => (
            <button
              key={bookmaker}
              onClick={() => toggleBookmaker(bookmaker)}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                settings.favorite_bookmakers.includes(bookmaker)
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'hover:bg-muted/50'
              }`}
            >
              <span className="text-sm font-medium">{bookmaker}</span>
              {settings.favorite_bookmakers.includes(bookmaker) && (
                <Check className="h-4 w-4" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
