-- ==================================================================================
-- VANTEDGE MIGRATION 06: TRIGGERS
-- ==================================================================================
-- Run AFTER 05_admin_functions.sql
-- ==================================================================================

-- Drop existing triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS bankrolls_updated_at ON public.bankrolls;
DROP TRIGGER IF EXISTS payment_gateways_updated_at ON public.payment_gateways;
DROP TRIGGER IF EXISTS site_settings_updated_at ON public.site_settings;
DROP TRIGGER IF EXISTS subscription_plans_updated_at ON public.subscription_plans;
DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
DROP TRIGGER IF EXISTS bets_calculate_clv ON public.bets;

-- Create trigger on auth.users for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER bankrolls_updated_at 
  BEFORE UPDATE ON public.bankrolls 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER payment_gateways_updated_at 
  BEFORE UPDATE ON public.payment_gateways 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER site_settings_updated_at 
  BEFORE UPDATE ON public.site_settings 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER subscription_plans_updated_at 
  BEFORE UPDATE ON public.subscription_plans 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER subscriptions_updated_at 
  BEFORE UPDATE ON public.subscriptions 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- CLV calculation trigger
CREATE TRIGGER bets_calculate_clv 
  BEFORE INSERT OR UPDATE ON public.bets 
  FOR EACH ROW EXECUTE FUNCTION public.calculate_clv();

-- Verify triggers created
SELECT trigger_name, event_object_table FROM information_schema.triggers 
WHERE trigger_schema = 'public' OR event_object_schema = 'auth'
ORDER BY trigger_name;
