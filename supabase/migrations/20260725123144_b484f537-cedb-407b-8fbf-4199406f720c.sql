-- Explicit deny-write policies for authenticated users on sensitive tables.
-- Service role bypasses RLS and continues to perform legitimate writes
-- (webhooks, OAuth callback, credit RPC).

-- credit_usage: ledger — only service role writes
CREATE POLICY "Deny authenticated insert on credit_usage" ON public.credit_usage
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny authenticated update on credit_usage" ON public.credit_usage
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated delete on credit_usage" ON public.credit_usage
  FOR DELETE TO authenticated USING (false);

-- user_credits: balances — only service role writes
CREATE POLICY "Deny authenticated insert on user_credits" ON public.user_credits
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny authenticated update on user_credits" ON public.user_credits
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated delete on user_credits" ON public.user_credits
  FOR DELETE TO authenticated USING (false);

-- subscriptions: billing — only service role (Paddle webhook) writes
CREATE POLICY "Deny authenticated insert on subscriptions" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny authenticated update on subscriptions" ON public.subscriptions
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated delete on subscriptions" ON public.subscriptions
  FOR DELETE TO authenticated USING (false);

-- github_connections: OAuth tokens — only service role (OAuth callback) writes
CREATE POLICY "Deny authenticated insert on github_connections" ON public.github_connections
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny authenticated update on github_connections" ON public.github_connections
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);