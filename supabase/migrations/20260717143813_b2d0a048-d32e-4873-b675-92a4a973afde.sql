
-- 1. Memory table for cross-device intelligence memory
CREATE TABLE IF NOT EXISTS public.intel_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('screen','system','knowledge','repo')),
  title text NOT NULL,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intel_memory_user_mode_created
  ON public.intel_memory(user_id, mode, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intel_memory TO authenticated;
GRANT ALL ON public.intel_memory TO service_role;

ALTER TABLE public.intel_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own intel memory"
  ON public.intel_memory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.intel_memory_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_intel_memory_touch ON public.intel_memory;
CREATE TRIGGER trg_intel_memory_touch
  BEFORE UPDATE ON public.intel_memory
  FOR EACH ROW EXECUTE FUNCTION public.intel_memory_touch();

-- 2. Atomic credit deduction RPC
CREATE OR REPLACE FUNCTION public.deduct_credit(
  p_user_id uuid,
  p_amount integer,
  p_env text DEFAULT 'live'
)
RETURNS TABLE(ok boolean, balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new integer;
BEGIN
  UPDATE public.user_credits
     SET balance = balance - p_amount,
         updated_at = now()
   WHERE user_id = p_user_id
     AND environment = p_env
     AND balance >= p_amount
  RETURNING balance INTO v_new;

  IF v_new IS NULL THEN
    SELECT balance INTO v_new FROM public.user_credits
      WHERE user_id = p_user_id AND environment = p_env;
    RETURN QUERY SELECT false, COALESCE(v_new, 0);
  ELSE
    RETURN QUERY SELECT true, v_new;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_credit(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credit(uuid, integer, text) TO service_role;

-- 3. Purge legacy runtime-error notifications (dummies from the old reporter)
DELETE FROM public.notifications
 WHERE category = 'runtime'
    OR title IN ('Unhandled promise rejection','Runtime error');
