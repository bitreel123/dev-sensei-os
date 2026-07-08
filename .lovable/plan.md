## What I'll change

### 1. Auth completeness
- **Auto-confirm signups** — flip Supabase auth so email confirmation is not required. New users log in immediately after clicking "Create account".
- **Configure Google provider** in Supabase so Google sign-in actually works (currently would error `Unsupported provider` on first attempt).
- **Forgot / reset password**:
  - New route `/forgot-password` — email input, calls `resetPasswordForEmail(email, { redirectTo: ${origin}/reset-password })`.
  - New route `/reset-password` — password input, reads recovery token from URL, calls `updateUser({ password })`.
  - Add "Forgot password?" link on `/login`.

### 2. New signed-in Account page (`/account`)
- Shows: email, current plan, monthly credits, current balance, billing cycle, current period end, cancel status.
- **Manage billing** button → opens Paddle customer portal in a new tab (server fn creates portal session using `getPaddleClient(env)`).
- **Cancel plan** button → calls a server fn that hits Paddle `POST /subscriptions/{id}/cancel` with `effective_from: "next_billing_period"` (grace period).
- **Sign out** button → `supabase.auth.signOut()`.
- Link to `/pricing` for upgrades.
- Header on `/pricing` gets an "Account" link when signed in (replaces the plain email badge).

### 3. Business logic fixes in the webhook
- **Renewal credit refill**: on `subscription.updated`, detect a new billing period (`current_period_start` differs from stored value) and **reset** `user_credits.balance = monthly_credits` for the current plan (per your choice: no leftover carry-over).
- **Cancel → Free at period end**: add a scheduled sweep that downgrades expired canceled subscriptions to Free with 5 credits.
  - New DB function `expire_canceled_subscriptions()` — for every row where `status='canceled'` AND `current_period_end < now()` AND not yet reconciled, reset `user_credits` to `{ plan:'free', monthly_credits:5, balance:5 }`.
  - Wire it to run every 15 min via `pg_cron`.
  - Also invoke it opportunistically at the top of `useUserData.refetch()` via a server fn, so a returning user immediately sees Free instead of waiting for cron.
- **Dunning**: handle `transaction.payment_failed` → set `subscriptions.status='past_due'`; `subscription.updated` with `status='past_due'` already flows through the update handler. Show a red banner on `/account` and `/pricing` when `status='past_due'` with a "Update payment method" link into the customer portal.

### 4. Environment isolation for credits
- Add `environment text not null default 'sandbox'` to `user_credits`, drop unique on `user_id`, add unique on `(user_id, environment)`.
- Update `handle_new_user` trigger to seed both `sandbox` and `live` rows.
- Update webhook writes and `useUserData` reads to filter by current env, using the same `getPaddleEnvironment()` helper as `subscriptions`.

### 5. Small correctness bits
- `/pricing` current-plan strip: pull `credits` filtered by env so preview stops reading live plan state.
- `subscription.updated` handler: also reset credits when Paddle sends a plan change *and* period rollover on the same event.

---

## Technical detail (implementer notes)

**Files to add**
- `src/routes/forgot-password.tsx`
- `src/routes/reset-password.tsx`
- `src/routes/account.tsx`
- `src/lib/account.functions.ts` — `openBillingPortal`, `cancelSubscription`, `reconcileExpiredCanceled` (all `.middleware([requireSupabaseAuth])`).

**Files to edit**
- `src/routes/api/public/payments/webhook.ts` — add renewal detection + payment_failed handler.
- `src/hooks/use-user-data.ts` — env filter on `user_credits`, opportunistic reconcile call.
- `src/routes/login.tsx` — "Forgot password?" link.
- `src/routes/pricing.tsx` — account link when signed in, past_due banner.
- `src/components/jeradin/header.tsx` — Account link when signed in.

**Migration**
```sql
-- environment on user_credits
alter table public.user_credits add column environment text not null default 'sandbox';
alter table public.user_credits drop constraint user_credits_pkey; -- if PK is user_id
alter table public.user_credits add primary key (user_id, environment);

-- seed both envs on signup: update handle_new_user()
-- expire_canceled_subscriptions() SECURITY DEFINER function
-- pg_cron: every 15 minutes call the function
```

**Auth config calls**
- `configure_auth({ auto_confirm_email: true, disable_signup: false, external_anonymous_users_enabled: false, password_hibp_enabled: true })`
- `configure_social_auth` for Google.

---

## How to test in the preview

The preview always runs against **test mode** — an orange banner shows this at the top of `/pricing`. All test purchases hit the sandbox environment and never charge real cards.

1. **New user flow**
   - Go to `/signup`, create `test@example.com` / any password. You're logged in immediately (auto-confirm is on).
   - Land on `/pricing`. Current plan strip shows "Free · 5 credits".

2. **Buy a plan**
   - Pick any tier (Basic/Pro/Elite), pick a credit option, click Subscribe.
   - In the Paddle checkout overlay use test card **`4242 4242 4242 4242`**, CVC **`123`**, any future expiry.
   - After success you're redirected back to `/pricing?checkout=success`. Within a few seconds the current plan strip updates to the new tier and credit count (realtime).

3. **Password reset**
   - `/login` → "Forgot password?" → enter your email → check inbox → click link → set new password → sign in with it.

4. **Account page**
   - Click "Account" in the header. You see plan, credits, period end, and a "Manage billing" button that opens the Paddle customer portal in a new tab.

5. **Cancel & downgrade**
   - Click "Cancel plan". Confirmation appears; row flips to `cancel_at_period_end=true` and shows "Cancels at <date>".
   - To simulate the period ending in the preview: use the Paddle test-mode Subscriptions API to fast-forward `next_billed_at` (I can add a hidden dev button on `/account` for this if you want). Within 15 minutes (cron) or after refreshing `/account` (opportunistic reconcile) the user drops to Free / 5 credits.

6. **Failed payment (dunning)**
   - Subscribe with card **`4000 0027 6000 3184`** (succeeds initially, declines on renewal).
   - Fast-forward the billing date. On the next renewal attempt the webhook fires `past_due`; a red banner appears on `/account` and `/pricing` with "Update payment method".

7. **Renewal credits**
   - After a successful renewal (fast-forward), balance resets to the plan's `monthly_credits` value — leftover is not carried over.

8. **Going live**
   - When you finish Paddle verification and publish the app, the production build uses the live token automatically. Products sync live. Test-mode banner disappears. Real cards work.

Say go and I'll implement all of this in one pass.