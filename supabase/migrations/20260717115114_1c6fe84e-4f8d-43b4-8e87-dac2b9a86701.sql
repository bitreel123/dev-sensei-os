create table if not exists public.extension_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  label text not null default 'Chrome extension',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists extension_tokens_user_id_idx on public.extension_tokens(user_id);

grant select, insert, update, delete on public.extension_tokens to authenticated;
grant all on public.extension_tokens to service_role;

alter table public.extension_tokens enable row level security;

create policy "users read own extension tokens"
  on public.extension_tokens for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert own extension tokens"
  on public.extension_tokens for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update own extension tokens"
  on public.extension_tokens for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own extension tokens"
  on public.extension_tokens for delete
  to authenticated
  using (auth.uid() = user_id);