
-- 1. Environment column on user_credits
ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox';

-- Drop old PK on user_id, add composite (user_id, environment)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_credits_pkey' AND conrelid = 'public.user_credits'::regclass
  ) THEN
    ALTER TABLE public.user_credits DROP CONSTRAINT user_credits_pkey;
  END IF;
END $$;

ALTER TABLE public.user_credits ADD PRIMARY KEY (user_id, environment);

-- 2. Update signup trigger to seed both environments
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_credits (user_id, environment, plan, monthly_credits, balance)
  VALUES
    (NEW.id, 'sandbox', 'free', 5, 5),
    (NEW.id, 'live',    'free', 5, 5)
  ON CONFLICT (user_id, environment) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: any existing user_credits rows are sandbox by default; ensure live rows exist
INSERT INTO public.user_credits (user_id, environment, plan, monthly_credits, balance)
SELECT user_id, 'live', 'free', 5, 5
FROM public.user_credits
WHERE environment = 'sandbox'
ON CONFLICT (user_id, environment) DO NOTHING;

-- 3. Reconcile expired canceled subscriptions -> Free
CREATE OR REPLACE FUNCTION public.expire_canceled_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer := 0;
BEGIN
  WITH expired AS (
    SELECT DISTINCT s.user_id, s.environment
    FROM public.subscriptions s
    WHERE s.status = 'canceled'
      AND s.current_period_end IS NOT NULL
      AND s.current_period_end < now()
  ),
  updated AS (
    UPDATE public.user_credits uc
    SET plan = 'free',
        monthly_credits = 5,
        balance = 5,
        updated_at = now()
    FROM expired e
    WHERE uc.user_id = e.user_id
      AND uc.environment = e.environment
      AND uc.plan <> 'free'
    RETURNING 1
  )
  SELECT count(*) INTO affected FROM updated;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_canceled_subscriptions() TO authenticated, service_role;

-- 4. pg_cron schedule (every 15 minutes)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-canceled-subs') THEN
    PERFORM cron.unschedule('expire-canceled-subs');
  END IF;
  PERFORM cron.schedule(
    'expire-canceled-subs',
    '*/15 * * * *',
    $cron$SELECT public.expire_canceled_subscriptions();$cron$
  );
END $$;
