-- ==================================================================================
-- VANTEDGE MIGRATION 05: ADMIN FUNCTIONS
-- ==================================================================================
-- Run AFTER 04_functions.sql
-- These functions return table types, so tables must exist first
-- ==================================================================================

-- Admin functions for subscription plans
DROP FUNCTION IF EXISTS public.admin_get_subscription_plans();
CREATE OR REPLACE FUNCTION public.admin_get_subscription_plans()
RETURNS SETOF public.subscription_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN QUERY SELECT * FROM subscription_plans ORDER BY created_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_upsert_subscription_plan(uuid, text, text, text, jsonb, jsonb, jsonb, boolean, integer);
CREATE OR REPLACE FUNCTION public.admin_upsert_subscription_plan(
  p_id uuid, 
  p_slug text, 
  p_name text, 
  p_description text, 
  p_prices jsonb, 
  p_features jsonb, 
  p_limits jsonb, 
  p_is_popular boolean, 
  p_sort_order integer
)
RETURNS public.subscription_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan public.subscription_plans;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  INSERT INTO subscription_plans (id, slug, name, description, prices, features, limits, is_popular, sort_order)
  VALUES (COALESCE(p_id, gen_random_uuid()), p_slug, p_name, p_description, p_prices, p_features, p_limits, p_is_popular, p_sort_order)
  ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    prices = EXCLUDED.prices,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    is_popular = EXCLUDED.is_popular,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW()
  RETURNING * INTO v_plan;
  
  RETURN v_plan;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_delete_subscription_plan(uuid);
CREATE OR REPLACE FUNCTION public.admin_delete_subscription_plan(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  DELETE FROM subscription_plans WHERE id = p_id;
  RETURN TRUE;
END;
$$;

-- Admin functions for site settings
DROP FUNCTION IF EXISTS public.admin_get_site_settings();
CREATE OR REPLACE FUNCTION public.admin_get_site_settings()
RETURNS SETOF public.site_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN QUERY SELECT * FROM site_settings ORDER BY key;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_update_site_setting(text, jsonb);
CREATE OR REPLACE FUNCTION public.admin_update_site_setting(p_key text, p_value jsonb)
RETURNS public.site_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_setting public.site_settings;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE site_settings 
  SET 
    value = p_value,
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE key = p_key
  RETURNING * INTO v_setting;
  
  RETURN v_setting;
END;
$$;

-- Admin functions for payment gateways
DROP FUNCTION IF EXISTS public.admin_get_payment_gateways();
CREATE OR REPLACE FUNCTION public.admin_get_payment_gateways()
RETURNS SETOF public.payment_gateways
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN QUERY SELECT * FROM payment_gateways ORDER BY priority;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_update_payment_gateway(uuid, boolean, boolean, jsonb);
CREATE OR REPLACE FUNCTION public.admin_update_payment_gateway(
  p_id uuid, 
  p_is_enabled boolean, 
  p_is_test_mode boolean, 
  p_credentials jsonb
)
RETURNS public.payment_gateways
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_gateway public.payment_gateways;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE payment_gateways 
  SET 
    is_enabled = p_is_enabled,
    is_test_mode = p_is_test_mode,
    credentials = p_credentials,
    updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_gateway;
  
  RETURN v_gateway;
END;
$$;
