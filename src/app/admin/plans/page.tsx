'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Save,
  X,
  Star,
  Check,
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  description: string;
  features: string[];
  is_active: boolean;
  is_popular: boolean;
  trial_days: number;
  prices: Record<string, { monthly: number; yearly: number }>;
  limits: Record<string, number | boolean>;
  sort_order: number;
}

const defaultPlan: Omit<SubscriptionPlan, 'id'> = {
  slug: '',
  name: '',
  description: '',
  features: [],
  is_active: true,
  is_popular: false,
  trial_days: 0,
  prices: {
    NGN: { monthly: 0, yearly: 0 },
    USD: { monthly: 0, yearly: 0 },
  },
  limits: {
    max_bets_per_month: -1,
    max_alerts_per_day: 0,
    clv_tracking: false,
    extension_sync: false,
    history_days: 7,
  },
  sort_order: 0,
};

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const { data, error } = await supabase
        .rpc('admin_get_subscription_plans');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  }

  async function savePlan() {
    if (!editingPlan) return;
    setSaving(true);

    try {
      const { error } = await supabase.rpc('admin_upsert_subscription_plan', {
        p_id: isCreating ? null : editingPlan.id,
        p_slug: editingPlan.slug,
        p_name: editingPlan.name,
        p_description: editingPlan.description,
        p_prices: editingPlan.prices,
        p_features: editingPlan.features,
        p_limits: editingPlan.limits,
        p_is_popular: editingPlan.is_popular,
        p_sort_order: editingPlan.sort_order,
      });

      if (error) throw error;

      await loadPlans();
      setEditingPlan(null);
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to save plan:', error);
      alert('Failed to save. Make sure you have admin permissions.');
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(id: string) {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      const { error } = await supabase.rpc('admin_delete_subscription_plan', {
        p_id: id
      });
      if (error) throw error;
      await loadPlans();
    } catch (error) {
      console.error('Failed to delete plan:', error);
      alert('Failed to delete. Make sure you have admin permissions.');
    }
  }

  function startCreating() {
    setIsCreating(true);
    setEditingPlan({
      ...defaultPlan,
      id: 'new',
      sort_order: plans.length + 1,
    } as SubscriptionPlan);
  }

  function addFeature() {
    if (!newFeature.trim() || !editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: [...editingPlan.features, newFeature.trim()],
    });
    setNewFeature('');
  }

  function removeFeature(index: number) {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: editingPlan.features.filter((_, i) => i !== index),
    });
  }

  function updatePrice(currency: string, interval: 'monthly' | 'yearly', value: number) {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      prices: {
        ...editingPlan.prices,
        [currency]: {
          ...editingPlan.prices[currency],
          [interval]: value,
        },
      },
    });
  }

  function updateLimit(key: string, value: number | boolean) {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      limits: {
        ...editingPlan.limits,
        [key]: value,
      },
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Subscription Plans</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Manage your pricing tiers and features
          </p>
        </div>
        <button
          onClick={startCreating}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white dark:bg-neutral-900 border rounded-xl overflow-hidden ${
              plan.is_popular
                ? 'border-emerald-500 shadow-sm'
                : plan.is_active
                ? 'border-neutral-200 dark:border-neutral-800 shadow-sm'
                : 'border-neutral-200 dark:border-neutral-800 opacity-60'
            }`}
          >
            {plan.is_popular && (
              <div className="absolute top-4 right-4">
                <span className="px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Popular
                </span>
              </div>
            )}

            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{plan.name}</h3>
                {!plan.is_active && (
                  <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 text-xs rounded">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">{plan.description}</p>

              {/* Pricing */}
              <div className="mb-4">
                <div className="text-3xl font-bold text-neutral-900 dark:text-white">
                  ₦{plan.prices.NGN?.monthly.toLocaleString()}
                  <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">/mo</span>
                </div>
                <div className="text-sm text-neutral-500">
                  or ₦{plan.prices.NGN?.yearly.toLocaleString()}/year
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {(Array.isArray(plan.features) ? plan.features : []).slice(0, 4).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
                {Array.isArray(plan.features) && plan.features.length > 4 && (
                  <li className="text-sm text-neutral-500">
                    +{plan.features.length - 4} more features
                  </li>
                )}
              </ul>


              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setEditingPlan(plan);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                {plan.slug !== 'free' && (
                  <button
                    onClick={() => deletePlan(plan.id)}
                    className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white dark:bg-neutral-900 z-10">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isCreating ? 'Create Plan' : 'Edit Plan'}
              </h2>
              <button
                onClick={() => {
                  setEditingPlan(null);
                  setIsCreating(false);
                }}
                className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Slug (URL-friendly ID)
                  </label>
                  <input
                    type="text"
                    value={editingPlan.slug}
                    onChange={(e) => setEditingPlan({ ...editingPlan, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    disabled={!isCreating}
                    placeholder="e.g., starter"
                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:bg-neutral-100 dark:disabled:bg-neutral-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    placeholder="e.g., Starter"
                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Description
                </label>
                <textarea
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  rows={2}
                  placeholder="Brief description of this plan..."
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.is_active}
                    onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${editingPlan.is_active ? 'bg-emerald-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transform transition-transform mt-0.5 ${editingPlan.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.is_popular}
                    onChange={(e) => setEditingPlan({ ...editingPlan, is_popular: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${editingPlan.is_popular ? 'bg-emerald-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transform transition-transform mt-0.5 ${editingPlan.is_popular ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Popular Badge</span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-neutral-700 dark:text-neutral-300">Trial Days:</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPlan.trial_days}
                    onChange={(e) => setEditingPlan({ ...editingPlan, trial_days: parseInt(e.target.value) || 0 })}
                    className="w-16 px-2 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-900 dark:text-white text-center"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">Pricing</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
                    <div className="text-sm font-medium text-neutral-900 dark:text-white mb-3">🇳🇬 NGN</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-neutral-500 dark:text-neutral-400">Monthly</label>
                        <input
                          type="number"
                          min="0"
                          value={editingPlan.prices.NGN?.monthly || 0}
                          onChange={(e) => updatePrice('NGN', 'monthly', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-500 dark:text-neutral-400">Yearly</label>
                        <input
                          type="number"
                          min="0"
                          value={editingPlan.prices.NGN?.yearly || 0}
                          onChange={(e) => updatePrice('NGN', 'yearly', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
                    <div className="text-sm font-medium text-neutral-900 dark:text-white mb-3">🇺🇸 USD</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-neutral-500 dark:text-neutral-400">Monthly</label>
                        <input
                          type="number"
                          min="0"
                          value={editingPlan.prices.USD?.monthly || 0}
                          onChange={(e) => updatePrice('USD', 'monthly', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-500 dark:text-neutral-400">Yearly</label>
                        <input
                          type="number"
                          min="0"
                          value={editingPlan.prices.USD?.yearly || 0}
                          onChange={(e) => updatePrice('USD', 'yearly', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">Features</h4>
                <div className="space-y-2 mb-3">
                  {editingPlan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2 border border-neutral-200 dark:border-neutral-700">
                      <GripVertical className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="flex-1 text-sm text-neutral-900 dark:text-white">{feature}</span>
                      <button
                        onClick={() => removeFeature(i)}
                        className="text-neutral-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFeature()}
                    placeholder="Add a feature..."
                    className="flex-1 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={addFeature}
                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Limits */}
              <div>
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">Limits (-1 = Unlimited)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-neutral-500 dark:text-neutral-400">Max Bets/Month</label>
                    <input
                      type="number"
                      value={editingPlan.limits.max_bets_per_month as number}
                      onChange={(e) => updateLimit('max_bets_per_month', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 dark:text-neutral-400">Max Alerts/Day</label>
                    <input
                      type="number"
                      value={editingPlan.limits.max_alerts_per_day as number}
                      onChange={(e) => updateLimit('max_alerts_per_day', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 dark:text-neutral-400">History Days</label>
                    <input
                      type="number"
                      value={editingPlan.limits.history_days as number}
                      onChange={(e) => updateLimit('history_days', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPlan.limits.clv_tracking as boolean}
                        onChange={(e) => updateLimit('clv_tracking', e.target.checked)}
                        className="w-4 h-4 rounded bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-emerald-500"
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">CLV Tracking</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPlan.limits.extension_sync as boolean}
                        onChange={(e) => updateLimit('extension_sync', e.target.checked)}
                        className="w-4 h-4 rounded bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-emerald-500"
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">Extension Sync</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-neutral-900 z-10">
              <button
                onClick={() => {
                  setEditingPlan(null);
                  setIsCreating(false);
                }}
                className="px-4 py-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={savePlan}
                disabled={saving || !editingPlan.slug || !editingPlan.name}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Plan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
