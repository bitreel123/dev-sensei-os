CREATE OR REPLACE FUNCTION public.deduct_credit(
  p_user_id uuid,
  p_amount integer,
  p_env text DEFAULT 'live'::text,
  p_mode text DEFAULT 'screen'::text,
  p_session_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(ok boolean, balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new integer;
BEGIN
  IF p_amount <= 0
     OR p_env NOT IN ('live', 'sandbox')
     OR p_mode NOT IN ('screen', 'screen_deep', 'system', 'knowledge', 'repo') THEN
    RAISE EXCEPTION 'Invalid credit charge';
  END IF;

  UPDATE public.user_credits AS uc
     SET balance = uc.balance - p_amount,
         updated_at = now()
   WHERE uc.user_id = p_user_id
     AND uc.environment = p_env
     AND uc.balance >= p_amount
  RETURNING uc.balance INTO v_new;

  IF v_new IS NULL THEN
    SELECT uc.balance
      INTO v_new
      FROM public.user_credits AS uc
     WHERE uc.user_id = p_user_id
       AND uc.environment = p_env;

    RETURN QUERY SELECT false, COALESCE(v_new, 0);
    RETURN;
  END IF;

  INSERT INTO public.credit_usage(
    user_id,
    environment,
    mode,
    amount,
    session_id,
    balance_after
  )
  VALUES (
    p_user_id,
    p_env,
    p_mode,
    p_amount,
    p_session_id,
    v_new
  );

  RETURN QUERY SELECT true, v_new;
END;
$function$;