import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OpportunitiesList } from '@/components/opportunities/opportunities-list';

export default async function OpportunitiesPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get user's subscription tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, email')
    .eq('id', user.id)
    .single();

  const tier = profile?.subscription_tier || 'free';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Value Opportunities</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
          Discover +EV betting opportunities with sharp market alignment
        </p>
      </div>

      {/* Opportunities List */}
      <OpportunitiesList tier={tier} />
    </div>
  );
}
