-- Fix RLS for Admin Access

-- 1. Ensure admin_users has a read policy so we can query it in other policies
-- Note: We assume admin_users table exists since is_user_admin depends on it.
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view own admin status" ON admin_users;
CREATE POLICY "Admins can view own admin status" 
  ON admin_users FOR SELECT 
  USING (user_id = auth.uid());

-- 2. Profiles: Allow Admins to View/Edit ALL profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" 
  ON profiles FOR SELECT 
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" 
  ON profiles FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- 3. Value Opportunities: Ensure RLS is enabled and policies exist
ALTER TABLE value_opportunities ENABLE ROW LEVEL SECURITY;

-- Allow public read access to opportunities (API needs this)
DROP POLICY IF EXISTS "Public view opportunities" ON value_opportunities;
CREATE POLICY "Public view opportunities" 
  ON value_opportunities FOR SELECT 
  USING (true);

-- Allow Admins full control
DROP POLICY IF EXISTS "Admins can manage opportunities" ON value_opportunities;
CREATE POLICY "Admins can manage opportunities" 
  ON value_opportunities FOR ALL 
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- 4. Subscriptions: Allow Admins to view all
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
CREATE POLICY "Admins can view all subscriptions" 
  ON subscriptions FOR SELECT 
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
