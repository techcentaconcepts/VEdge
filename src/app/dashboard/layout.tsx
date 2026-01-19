import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/components/dashboard/nav';
import { DashboardSidebar } from '@/components/dashboard/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
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

  // Check if user is admin - redirect them to admin panel
  const { data: adminCheck } = await supabase
    .rpc('is_user_admin');

  if (adminCheck && adminCheck.length > 0) {
    redirect('/admin');
  }

  return (
    <div className="min-h-screen bg-brand-50 dark:bg-gray-950">
      <DashboardNav user={user} profile={profile} />
      <div className="flex">
        <DashboardSidebar />
        <main className="flex-1 lg:pl-64">
          <div className="p-4 lg:p-8 pt-20 lg:pt-24 max-w-[1920px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
