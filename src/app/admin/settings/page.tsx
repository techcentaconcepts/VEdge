'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  Settings,
  Save,
  Globe,
  Bell,
  Shield,
  Database,
  Trash2,
  AlertTriangle,
  Check,
} from 'lucide-react';

interface SiteSetting {
  id: string;
  key: string;
  value: any;
  description: string;
  is_sensitive: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Record<string, any>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .rpc('admin_get_site_settings');

      if (error) throw error;
      setSettings(data || []);

      // Initialize edited state
      const edited: Record<string, any> = {};
      data?.forEach(s => {
        edited[s.key] = s.value;
      });
      setEditedSettings(edited);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setMessage(null);

    try {
      for (const setting of settings) {
        if (JSON.stringify(setting.value) !== JSON.stringify(editedSettings[setting.key])) {
          const { error } = await supabase.rpc('admin_update_site_setting', {
            p_key: setting.key,
            p_value: editedSettings[setting.key],
          });

          if (error) throw error;
        }
      }

      await loadSettings();
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: 'Failed to save. Make sure you have super admin permissions.' });
    } finally {
      setSaving(false);
    }
  }

  function updateSetting(key: string, value: any) {
    setEditedSettings(prev => ({ ...prev, [key]: value }));
  }

  const hasChanges = settings.some(s => 
    JSON.stringify(s.value) !== JSON.stringify(editedSettings[s.key])
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings className="w-7 h-7 text-emerald-500" />
            Site Settings
          </h1>
          <p className="text-neutral-400 mt-1">
            Configure global site settings and preferences
          </p>
        </div>
        <button
          onClick={saveSettings}
          disabled={!hasChanges || saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            hasChanges
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/20' 
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          )}
          <p className={message.type === 'success' ? 'text-emerald-200' : 'text-red-200'}>
            {message.text}
          </p>
        </div>
      )}

      {/* General Settings */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            General
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Site Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Site Name
            </label>
            <input
              type="text"
              value={typeof editedSettings.site_name === 'string' 
                ? editedSettings.site_name 
                : JSON.parse(editedSettings.site_name || '""')}
              onChange={(e) => updateSetting('site_name', JSON.stringify(e.target.value))}
              className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Displayed in the header and browser title
            </p>
          </div>

          {/* Site Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Site Description
            </label>
            <textarea
              value={typeof editedSettings.site_description === 'string'
                ? editedSettings.site_description
                : JSON.parse(editedSettings.site_description || '""')}
              onChange={(e) => updateSetting('site_description', JSON.stringify(e.target.value))}
              rows={2}
              className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Default Currency */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Default Currency
            </label>
            <select
              value={typeof editedSettings.default_currency === 'string'
                ? editedSettings.default_currency
                : JSON.parse(editedSettings.default_currency || '"NGN"')}
              onChange={(e) => updateSetting('default_currency', JSON.stringify(e.target.value))}
              className="w-48 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="NGN">🇳🇬 NGN - Nigerian Naira</option>
              <option value="USD">🇺🇸 USD - US Dollar</option>
              <option value="GBP">🇬🇧 GBP - British Pound</option>
              <option value="EUR">🇪🇺 EUR - Euro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Maintenance Mode */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Maintenance
          </h2>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Maintenance Mode</p>
              <p className="text-xs text-neutral-400 mt-1">
                When enabled, users will see a maintenance page instead of the app
              </p>
            </div>
            <button
              onClick={() => {
                const current = editedSettings.maintenance_mode === 'true' || editedSettings.maintenance_mode === true;
                updateSetting('maintenance_mode', (!current).toString());
              }}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                editedSettings.maintenance_mode === 'true' || editedSettings.maintenance_mode === true
                  ? 'bg-amber-500' 
                  : 'bg-neutral-700'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  editedSettings.maintenance_mode === 'true' || editedSettings.maintenance_mode === true
                    ? 'left-8' 
                    : 'left-1'
                }`}
              />
            </button>
          </div>

          {(editedSettings.maintenance_mode === 'true' || editedSettings.maintenance_mode === true) && (
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-amber-200">
                <AlertTriangle className="w-5 h-5" />
                <p className="text-sm font-medium">
                  Warning: Maintenance mode is enabled
                </p>
              </div>
              <p className="text-xs text-amber-200/70 mt-1">
                Users will not be able to access the app while this is enabled.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Database Info */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-500" />
            Database
          </h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-800 rounded-lg p-4">
              <p className="text-xs text-neutral-400 uppercase tracking-wide">Provider</p>
              <p className="text-lg font-semibold text-white mt-1">Supabase</p>
            </div>
            <div className="bg-neutral-800 rounded-lg p-4">
              <p className="text-xs text-neutral-400 uppercase tracking-wide">Region</p>
              <p className="text-lg font-semibold text-white mt-1">eu-west-3 (Paris)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-neutral-900 border border-red-500/30 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-red-500/30">
          <h2 className="text-lg font-semibold text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-lg">
            <div>
              <p className="text-sm font-medium text-white">Clear All Scraper Data</p>
              <p className="text-xs text-neutral-400 mt-1">
                Remove all scraped odds history. This cannot be undone.
              </p>
            </div>
            <button className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors text-sm">
              Clear Data
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-lg">
            <div>
              <p className="text-sm font-medium text-white">Reset All Proxies</p>
              <p className="text-xs text-neutral-400 mt-1">
                Reset all proxy statuses and clear ban history.
              </p>
            </div>
            <button className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors text-sm">
              Reset Proxies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
