-- Tokens OAuth do Mercado Livre (fluxo authorization_code, conta do lojista).
-- A busca de anúncios (/sites/MLB/search) exige user token — app token não basta.
-- 1. Admin clica "Conectar" → autoriza no ML → callback salva aqui.
-- 2. O servidor renova sozinho via refresh_token (dura ~6 meses).
-- Tabela só-admin (RLS). Nunca exponha estes tokens no frontend.

create table if not exists public.ml_tokens (
  id bigint generated always as identity primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  ml_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ml_tokens enable row level security;

drop policy if exists "Admin gerencia ml_tokens" on public.ml_tokens;
create policy "Admin gerencia ml_tokens"
on public.ml_tokens for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
