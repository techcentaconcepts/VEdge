'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  CreditCard,
  Check,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  Save,
  TestTube,
} from 'lucide-react';

interface PaymentGateway {
  id: string;
  provider: string;
  display_name: string;
  is_enabled: boolean;
  is_test_mode: boolean;
  credentials: {
    public_key?: string;
    publishable_key?: string;
    secret_key?: string;
    webhook_secret?: string;
    encryption_key?: string;
  };
  supported_currencies: string[];
  priority: number;
}

const providerInfo: Record<string, { logo: string; color: string; docs: string }> = {
  paystack: {
    logo: '🟢',
    color: 'emerald',
    docs: 'https://paystack.com/docs',
  },
  flutterwave: {
    logo: '🟠',
    color: 'orange',
    docs: 'https://developer.flutterwave.com',
  },
  stripe: {
    logo: '🟣',
    color: 'purple',
    docs: 'https://stripe.com/docs',
  },
};

export default function PaymentGatewaysPage() {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [editedGateways, setEditedGateways] = useState<Record<string, PaymentGateway>>({});

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadGateways();
  }, []);

  async function loadGateways() {
    try {
      const { data, error } = await supabase
        .rpc('admin_get_payment_gateways');

      if (error) throw error;
      setGateways(data || []);
      
      // Initialize edited state
      const edited: Record<string, PaymentGateway> = {};
      data?.forEach((g: PaymentGateway) => { edited[g.id] = { ...g }; });
      setEditedGateways(edited);
    } catch (error) {
      console.error('Failed to load gateways:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveGateway(gateway: PaymentGateway) {
    setSaving(gateway.id);
    try {
      const { error } = await supabase.rpc('admin_update_payment_gateway', {
        p_id: gateway.id,
        p_is_enabled: gateway.is_enabled,
        p_is_test_mode: gateway.is_test_mode,
        p_credentials: gateway.credentials,
        p_priority: gateway.priority,
      });

      if (error) throw error;
      
      // Reload gateways to get fresh data
      await loadGateways();
    } catch (error) {
      console.error('Failed to save gateway:', error);
      alert('Failed to save. Make sure you have admin permissions.');
    } finally {
      setSaving(null);
    }
  }

  function updateGateway(id: string, updates: Partial<PaymentGateway>) {
    setEditedGateways(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates },
    }));
  }

  function updateCredential(id: string, key: string, value: string) {
    setEditedGateways(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        credentials: { ...prev[id].credentials, [key]: value },
      },
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Payment Gateways</h1>
        <p className="text-gray-500 dark:text-neutral-400 mt-1">
          Configure payment providers for your subscription plans
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">Security Notice</p>
          <p className="text-sm text-amber-700 dark:text-amber-200/70 mt-1">
            API keys are encrypted at rest. Never share your secret keys. Use test mode for development.
          </p>
        </div>
      </div>

      {/* Gateway Cards */}
      <div className="space-y-6">
        {gateways.map((gateway) => {
          const edited = editedGateways[gateway.id];
          const info = providerInfo[gateway.provider];
          const hasChanges = JSON.stringify(gateway) !== JSON.stringify(edited);

          return (
            <div
              key={gateway.id}
              className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{info?.logo}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {gateway.display_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-neutral-400">
                      Supports: {gateway.supported_currencies.join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Test Mode Toggle */}
                  <button
                    onClick={() => updateGateway(gateway.id, { is_test_mode: !edited.is_test_mode })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      edited.is_test_mode
                        ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500'
                        : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
                    }`}
                  >
                    <TestTube className="w-4 h-4" />
                    {edited.is_test_mode ? 'Test Mode' : 'Live Mode'}
                  </button>

                  {/* Enable Toggle */}
                  <button
                    onClick={() => updateGateway(gateway.id, { is_enabled: !edited.is_enabled })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      edited.is_enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        edited.is_enabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Credentials */}
              <div className="p-6 space-y-4">
                {/* Stripe Credentials */}
                {gateway.provider === 'stripe' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Publishable Key */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-300 mb-2">
                          Publishable Key
                        </label>
                        <input
                          type="text"
                          value={edited.credentials.publishable_key || ''}
                          onChange={(e) => updateCredential(gateway.id, 'publishable_key', e.target.value)}
                          placeholder={`pk_${edited.is_test_mode ? 'test' : 'live'}_...`}
                          className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Secret Key */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-300 mb-2">
                          Secret Key
                        </label>
                        <div className="relative">
                          <input
                            type={showSecrets[gateway.id] ? 'text' : 'password'}
                            value={edited.credentials.secret_key || ''}
                            onChange={(e) => updateCredential(gateway.id, 'secret_key', e.target.value)}
                            placeholder={`sk_${edited.is_test_mode ? 'test' : 'live'}_...`}
                            className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecrets(prev => ({ ...prev, [gateway.id]: !prev[gateway.id] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                          >
                            {showSecrets[gateway.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Webhook Secret */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-300 mb-2">
                        Webhook Secret
                      </label>
                      <input
                        type={showSecrets[gateway.id] ? 'text' : 'password'}
                        value={edited.credentials.webhook_secret || ''}
                        onChange={(e) => updateCredential(gateway.id, 'webhook_secret', e.target.value)}
                        placeholder="whsec_..."
                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                      />
                      <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                        Webhook URL: {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/{gateway.provider}
                      </p>
                    </div>
                  </>
                )}

                {/* Paystack Credentials */}
                {gateway.provider === 'paystack' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Public Key */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-300 mb-2">
                          Public Key
                        </label>
                        <input
                          type="text"
                          value={edited.credentials.public_key || ''}
                          onChange={(e) => updateCredential(gateway.id, 'public_key', e.target.value)}
                          placeholder={`pk_${edited.is_test_mode ? 'test' : 'live'}_...`}
                          className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Secret Key */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-300 mb-2">
                          Secret Key
                        </label>
                        <div className="relative">

                          <input
                            type={showSecrets[gateway.id] ? 'text' : 'password'}
                            value={edited.credentials.secret_key || ''}
                            onChange={(e) => updateCredential(gateway.id, 'secret_key', e.target.value)}
                            placeholder={`sk_${edited.is_test_mode ? 'test' : 'live'}_...`}
                            className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecrets(prev => ({ ...prev, [gateway.id]: !prev[gateway.id] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                          >
                            {showSecrets[gateway.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Webhook Secret */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-300 mb-2">
                        Webhook Secret Hash
                      </label>
                      <input
                        type={showSecrets[gateway.id] ? 'text' : 'password'}
                        value={edited.credentials.webhook_secret || ''}
                        onChange={(e) => updateCredential(gateway.id, 'webhook_secret', e.target.value)}
                        placeholder="Webhook secret hash..."
                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                      />
                      <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                        Webhook URL: {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/{gateway.provider}
                      </p>
                    </div>
                  </>
                )}

                {/* Flutterwave Credentials */}
                {gateway.provider === 'flutterwave' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Public Key */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-300 mb-2">
                          Public Key
                        </label>
                        <input
                          type="text"
                          value={edited.credentials.public_key || ''}
                          onChange={(e) => updateCredential(gateway.id, 'public_key', e.target.value)}
                          placeholder="FLWPUBK-..."
                          className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Secret Key */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-300 mb-2">
                          Secret Key
                        </label>
                        <div className="relative">
                          <input
                            type={showSecrets[gateway.id] ? 'text' : 'password'}
                            value={edited.credentials.secret_key || ''}
                            onChange={(e) => updateCredential(gateway.id, 'secret_key', e.target.value)}
                            placeholder="FLWSECK-..."
                            className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecrets(prev => ({ ...prev, [gateway.id]: !prev[gateway.id] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                          >
                            {showSecrets[gateway.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Encryption Key */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-300 mb-2">
                          Encryption Key
                        </label>
                        <div className="relative">
                          <input
                            type={showSecrets[gateway.id] ? 'text' : 'password'}
                            value={edited.credentials.encryption_key || ''}
                            onChange={(e) => updateCredential(gateway.id, 'encryption_key', e.target.value)}
                            placeholder="FLWSECK_TEST-..."
                            className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecrets(prev => ({ ...prev, [gateway.id]: !prev[gateway.id] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                          >
                            {showSecrets[gateway.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Webhook Secret */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-300 mb-2">
                        Webhook Secret Hash
                      </label>
                      <input
                        type={showSecrets[gateway.id] ? 'text' : 'password'}
                        value={edited.credentials.webhook_secret || ''}
                        onChange={(e) => updateCredential(gateway.id, 'webhook_secret', e.target.value)}
                        placeholder="Webhook secret hash..."
                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                      />
                      <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                        Webhook URL: {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/{gateway.provider}
                      </p>
                    </div>
                  </>
                )}

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-300 mb-2">
                    Priority (Lower = Preferred)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={edited.priority}
                    onChange={(e) => updateGateway(gateway.id, { priority: parseInt(e.target.value) || 1 })}
                    className="w-24 px-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 dark:bg-neutral-800/50 flex items-center justify-between">
                <a
                  href={info?.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-600 dark:text-emerald-500 hover:underline"
                >
                  View Documentation →
                </a>

                <button
                  onClick={() => saveGateway(edited)}
                  disabled={!hasChanges || saving === gateway.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    hasChanges
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-gray-200 dark:bg-neutral-700 text-gray-400 dark:text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  {saving === gateway.id ? (
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
