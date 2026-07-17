
-- Auto-provision Free credits on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, environment, plan, monthly_credits, balance)
  VALUES (NEW.id, 'live', 'free', 5, 5)
  ON CONFLICT (user_id, environment) DO NOTHING;
  INSERT INTO public.user_credits (user_id, environment, plan, monthly_credits, balance)
  VALUES (NEW.id, 'sandbox', 'free', 5, 5)
  ON CONFLICT (user_id, environment) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_user_credits ON auth.users;
CREATE TRIGGER trg_handle_new_user_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

-- Backfill any existing users missing a credit row
INSERT INTO public.user_credits (user_id, environment, plan, monthly_credits, balance)
SELECT u.id, 'live', 'free', 5, 5 FROM auth.users u
LEFT JOIN public.user_credits c
  ON c.user_id = u.id AND c.environment = 'live'
WHERE c.user_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.user_credits (user_id, environment, plan, monthly_credits, balance)
SELECT u.id, 'sandbox', 'free', 5, 5 FROM auth.users u
LEFT JOIN public.user_credits c
  ON c.user_id = u.id AND c.environment = 'sandbox'
WHERE c.user_id IS NULL
ON CONFLICT DO NOTHING;
