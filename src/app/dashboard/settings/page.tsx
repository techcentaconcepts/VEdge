'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Lock, CreditCard, Bell, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile({
        full_name: data.full_name || '',
        email: user.email || '',
        phone: '',
      });
    }

    setLoading(false);
  }

  async function saveProfile() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: profile.full_name })
      .eq('id', user.id);

    if (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } else {
      alert('Profile saved successfully!');
    }

    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {/* Profile Settings */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Profile Information</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border bg-background"
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-4 py-2 rounded-lg border bg-muted text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border bg-background"
              placeholder="+234 XXX XXX XXXX"
            />
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Security Settings */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Security</h3>
        </div>
        <div className="space-y-4">
          <button className="w-full sm:w-auto px-6 py-2 border border-primary text-primary rounded-lg font-medium hover:bg-primary/10">
            Change Password
          </button>
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Two-Factor Authentication</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add an extra layer of security to your account
            </p>
            <button className="px-6 py-2 border border-primary text-primary rounded-lg font-medium hover:bg-primary/10">
              Enable 2FA
            </button>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          {theme === 'dark' ? (
            <Moon className="h-5 w-5 text-primary" />
          ) : (
            <Sun className="h-5 w-5 text-primary" />
          )}
          <h3 className="text-lg font-semibold">Appearance</h3>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg border ${
                theme === 'light' ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'
              }`}
            >
              <Sun className="h-4 w-4" />
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg border ${
                theme === 'dark' ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'
              }`}
            >
              <Moon className="h-4 w-4" />
              Dark
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg border ${
                theme === 'system' ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'
              }`}
            >
              System
            </button>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Subscription</h3>
        </div>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="font-medium">Current Plan: Free</p>
            <p className="text-sm text-muted-foreground">Limited features and delayed alerts</p>
          </div>
          <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90">
            Upgrade to Pro
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-6">
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4">Danger Zone</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-red-700 dark:text-red-300 mb-2">
              Delete your account and all associated data
            </p>
            <button className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
