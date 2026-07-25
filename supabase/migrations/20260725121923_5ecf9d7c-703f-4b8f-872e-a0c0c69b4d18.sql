CREATE TABLE IF NOT EXISTS public.credit_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'live' CHECK (environment IN ('live', 'sandbox')),
  mode text NOT NULL CHECK (mode IN ('screen', 'screen_deep', 'system', 'knowledge', 'repo')),
  amount integer NOT NULL CHECK (amount > 0),
  session_id uuid,
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_usage TO authenticated;
GRANT ALL ON public.credit_usage TO service_role;
ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own credit usage" ON public.credit_usage;
CREATE POLICY "Users read own credit usage" ON public.credit_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_user_created ON public.credit_usage(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.deduct_credit(
  p_user_id uuid,
  p_amount integer,
  p_env text DEFAULT 'live',
  p_mode text DEFAULT 'screen',
  p_session_id uuid DEFAULT NULL
)
RETURNS TABLE(ok boolean, balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new integer;
BEGIN
  IF p_amount <= 0 OR p_env NOT IN ('live', 'sandbox') OR p_mode NOT IN ('screen', 'screen_deep', 'system', 'knowledge', 'repo') THEN
    RAISE EXCEPTION 'Invalid credit charge';
  END IF;

  UPDATE public.user_credits
     SET balance = balance - p_amount,
         updated_at = now()
   WHERE user_id = p_user_id
     AND environment = p_env
     AND balance >= p_amount
  RETURNING user_credits.balance INTO v_new;

  IF v_new IS NULL THEN
    SELECT user_credits.balance INTO v_new
      FROM public.user_credits
     WHERE user_id = p_user_id AND environment = p_env;
    RETURN QUERY SELECT false, COALESCE(v_new, 0);
    RETURN;
  END IF;

  INSERT INTO public.credit_usage(user_id, environment, mode, amount, session_id, balance_after)
  VALUES (p_user_id, p_env, p_mode, p_amount, p_session_id, v_new);

  RETURN QUERY SELECT true, v_new;
END;
$$;
REVOKE ALL ON FUNCTION public.deduct_credit(uuid, integer, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credit(uuid, integer, text, text, uuid) TO service_role;