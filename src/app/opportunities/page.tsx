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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OpportunitiesList tier={tier} />
      </div>
    </div>
  );
}
