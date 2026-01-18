import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/components/dashboard/nav';
import { DashboardSidebar } from '@/components/dashboard/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-neutral-950">
      <DashboardNav user={user} profile={profile} />
      <div className="flex">
        <DashboardSidebar />
        <main className="flex-1 lg:pl-64">
          <div className="p-4 lg:p-8 pt-20 lg:pt-24">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
