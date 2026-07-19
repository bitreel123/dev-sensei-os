UPDATE public.user_credits uc
SET plan = 'pro', monthly_credits = 600, balance = 600, updated_at = now()
FROM auth.users u
WHERE uc.user_id = u.id
  AND uc.environment = 'live'
  AND lower(u.email) IN ('iboy.innovationhub@gmail.com', 'sesanvk007@gmail.com');

DELETE FROM public.user_credits uc
USING auth.users u
WHERE uc.user_id = u.id
  AND uc.environment = 'sandbox'
  AND lower(u.email) IN ('iboy.innovationhub@gmail.com', 'sesanvk007@gmail.com');