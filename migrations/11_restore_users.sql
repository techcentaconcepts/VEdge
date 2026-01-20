-- ==================================================================================
-- VANTEDGE - RESTORE USER PROFILES
-- ==================================================================================
-- Run this AFTER signing up with your existing emails on the new project
-- This will restore profile data and admin access
-- ==================================================================================

-- ==================================================================================
-- STEP 1: Restore profile data for admin@vantedge.io
-- ==================================================================================
UPDATE profiles 
SET 
  full_name = 'Admin User',
  subscription_tier = 'free'
WHERE email = 'admin@vantedge.io';

-- ==================================================================================
-- STEP 2: Restore profile data for testuser@vantedge.io
-- ==================================================================================
UPDATE profiles 
SET 
  full_name = 'Test Pro User',
  subscription_tier = 'custom_pro'
WHERE email = 'testuser@vantedge.io';

-- ==================================================================================
-- STEP 3: Make admin@vantedge.io a super_admin
-- ==================================================================================
INSERT INTO admin_users (user_id, role, permissions) 
SELECT id, 'super_admin', '["read"]'::jsonb 
FROM profiles 
WHERE email = 'admin@vantedge.io'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'super_admin',
  permissions = '["read"]'::jsonb;

-- ==================================================================================
-- STEP 4: Create subscription for testuser (custom_pro)
-- ==================================================================================
INSERT INTO subscriptions (user_id, tier, status, current_period_start, current_period_end)
SELECT 
  id, 
  'pro',  -- Use 'pro' as tier since custom_pro might not be in the check constraint
  'active',
  NOW(),
  NOW() + INTERVAL '1 year'
FROM profiles 
WHERE email = 'testuser@vantedge.io'
ON CONFLICT (user_id) DO UPDATE SET
  tier = 'pro',
  status = 'active',
  current_period_end = NOW() + INTERVAL '1 year';

-- ==================================================================================
-- VERIFY RESTORATION
-- ==================================================================================
SELECT 
  p.email,
  p.full_name,
  p.subscription_tier,
  CASE WHEN a.id IS NOT NULL THEN 'Yes (' || a.role || ')' ELSE 'No' END as is_admin,
  CASE WHEN s.id IS NOT NULL THEN s.tier || ' - ' || s.status ELSE 'None' END as subscription
FROM profiles p
LEFT JOIN admin_users a ON a.user_id = p.id
LEFT JOIN subscriptions s ON s.user_id = p.id;
