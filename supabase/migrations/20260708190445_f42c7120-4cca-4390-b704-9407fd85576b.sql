
REVOKE EXECUTE ON FUNCTION public.expire_canceled_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_canceled_subscriptions() TO service_role;
