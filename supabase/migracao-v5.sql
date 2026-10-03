-- ACHADINHOSBR — MIGRAÇÃO V5 (V3: ofertas, categorias, histórico, campanhas, comissões, distribuição, settings)
-- Execute UMA VEZ no SQL Editor do Supabase, na ordem do arquivo.
-- NÃO toca em dados existentes: só CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS.
-- Reutiliza as tabelas V4 `products` e `clicks` (decisão Opção A).
-- Legado (`produtos`, `cliques`, `anuncios`, `historico_precos`) e V4
-- (`products`, `clicks`, `whatsapp_queue`, `whatsapp_logs`) continuam intactos.
-- RLS segue o padrão do projeto: público lê só publicado/ativo; escrita só admin;
-- insert público permitido apenas em rastreamento (clicks, já existente).

-- ===== 0. Extensão (idempotente) =====
create extension if not exists pgcrypto;

-- ===== 1. CATEGORIES =====
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "Categories ativas são públicas" on public.categories;
create policy "Categories ativas são públicas"
on public.categories for select
to anon, authenticated
using (active = true);

drop policy if exists "Admin gerencia categories" on public.categories;
create policy "Admin gerencia categories"
on public.categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Seeds das 11 categorias iniciais (idempotente: não duplica, não apaga).
insert into public.categories (name, slug) values
  ('Casa', 'casa'),
  ('Cozinha', 'cozinha'),
  ('Eletrônicos', 'eletronicos'),
  ('Informática', 'informatica'),
  ('Ferramentas', 'ferramentas'),
  ('Beleza', 'beleza'),
  ('Moda', 'moda'),
  ('Pet', 'pet'),
  ('Celulares', 'celulares'),
  ('Acessórios', 'acessorios'),
  ('Outros', 'outros')
on conflict (slug) do nothing;

-- ===== 2. OFFERS (V3) =====
-- Uma oferta = um produto V4 + preços + cupom/frete + score + ciclo de vida.
-- discount_percentage é SEMPRE calculado pelo trigger (nunca inventado à mão).
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  slug text unique,
  old_price numeric(12,2) check (old_price is null or old_price >= 0),
  current_price numeric(12,2) not null check (current_price >= 0),
  discount_percentage integer not null default 0
    check (discount_percentage >= 0 and discount_percentage <= 90),
  coupon_code text,
  coupon_value numeric(12,2) check (coupon_value is null or coupon_value >= 0),
  shipping_price numeric(12,2) check (shipping_price is null or shipping_price >= 0),
  score integer not null default 0 check (score >= 0 and score <= 100),
  score_level text not null default 'NAO_RECOMENDADA'
    check (score_level in ('EXCELENTE', 'BOA', 'NORMAL', 'NAO_RECOMENDADA')),
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'published', 'expired', 'rejected')),
  featured boolean not null default false,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offers_product_id_idx on public.offers(product_id);
create index if not exists offers_status_idx on public.offers(status);
create index if not exists offers_score_idx on public.offers(score desc);
create index if not exists offers_featured_idx on public.offers(featured) where featured = true;
create index if not exists offers_published_at_idx on public.offers(published_at desc);

-- updated_at automático + desconto calculado: ((old - current) / old) * 100.
-- Sem preço anterior válido: desconto = 0 (nunca inventa preço anterior).
create or replace function public.touch_offers()
returns trigger language plpgsql set search_path = public
as $$
begin
  NEW.updated_at = now();
  if NEW.old_price is not null and NEW.old_price > 0
     and NEW.current_price >= 0 and NEW.old_price > NEW.current_price then
    NEW.discount_percentage :=
      least(90, greatest(0, round(((NEW.old_price - NEW.current_price) / NEW.old_price) * 100)::int));
  else
    NEW.discount_percentage := 0;
  end if;
  return NEW;
end $$;

drop trigger if exists trg_offers_touch on public.offers;
create trigger trg_offers_touch
before insert or update of old_price, current_price on public.offers
for each row execute function public.touch_offers();

alter table public.offers enable row level security;

-- Público: lê SOMENTE publicadas e não expiradas.
drop policy if exists "Offers publicadas são públicas" on public.offers;
create policy "Offers publicadas são públicas"
on public.offers for select
to anon, authenticated
using (status = 'published' and (expires_at is null or expires_at > now()));

-- Admin: leitura/escrita total.
drop policy if exists "Admin gerencia offers" on public.offers;
create policy "Admin gerencia offers"
on public.offers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ===== 3. PRICE_HISTORY (V3, para products V4) =====
-- Só guarda preço/data/fonte. Sem PII: leitura pública liberada
-- (o site mostra menor/maior preço sem expor ninguém).
create table if not exists public.price_history (
  id bigint generated by default as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric(12,2) not null check (price >= 0),
  recorded_at timestamptz not null default now(),
  source text
);

create index if not exists price_history_product_id_idx on public.price_history(product_id);
create index if not exists price_history_recorded_at_idx on public.price_history(recorded_at desc);

alter table public.price_history enable row level security;

drop policy if exists "Price history é público" on public.price_history;
create policy "Price history é público"
on public.price_history for select
to anon, authenticated
using (true);

drop policy if exists "Admin gerencia price_history" on public.price_history;
create policy "Admin gerencia price_history"
on public.price_history for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Registra automaticamente toda mudança de preço em products.
-- Mesmo padrão do trigger legado trg_historico_preco (security definer).
create or replace function public.registrar_price_history()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (TG_OP = 'INSERT') or (OLD.price is distinct from NEW.price) then
    insert into public.price_history (product_id, price, source)
    values (NEW.id, NEW.price, 'products_trigger');
  end if;
  return NEW;
end $$;

drop trigger if exists trg_price_history on public.products;
create trigger trg_price_history
after insert or update of price on public.products
for each row execute function public.registrar_price_history();

-- ===== 4. CLICKS (V4 existente): colunas novas da V3 =====
-- Só ADD COLUMN IF NOT EXISTS — nenhum dado é alterado ou removido.
-- offer_id liga o clique à oferta; product_id continua obrigatório
-- (preencher com o product_id da oferta na ETAPA 6).
alter table public.clicks add column if not exists offer_id uuid references public.offers(id) on delete set null;
alter table public.clicks add column if not exists campaign text;
alter table public.clicks add column if not exists placement text;
alter table public.clicks add column if not exists device text;

create index if not exists clicks_offer_id_idx on public.clicks(offer_id);
create index if not exists clicks_campaign_idx on public.clicks(campaign);

-- ===== 5. CAMPAIGNS =====
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text,
  budget numeric(12,2) check (budget is null or budget >= 0),
  start_date date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.campaigns enable row level security;

drop policy if exists "Admin gerencia campaigns" on public.campaigns;
create policy "Admin gerencia campaigns"
on public.campaigns for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ===== 6. COMMISSION_RECORDS (lançamento manual) =====
-- Cliques NÃO viram vendas sozinhos: comissão só existe quando lançada aqui.
create table if not exists public.commission_records (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references public.offers(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'cancelled')),
  date date not null default current_date,
  source text
);

create index if not exists commission_records_offer_idx on public.commission_records(offer_id);
create index if not exists commission_records_campaign_idx on public.commission_records(campaign_id);
create index if not exists commission_records_status_idx on public.commission_records(status);

alter table public.commission_records enable row level security;

drop policy if exists "Admin gerencia commission_records" on public.commission_records;
create policy "Admin gerencia commission_records"
on public.commission_records for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ===== 7. SOCIAL_POSTS (estrutura p/ conteúdo/IA, ETAPA 9) =====
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references public.offers(id) on delete set null,
  channel text,
  legenda text,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'published')),
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists social_posts_offer_idx on public.social_posts(offer_id);

alter table public.social_posts enable row level security;

drop policy if exists "Admin gerencia social_posts" on public.social_posts;
create policy "Admin gerencia social_posts"
on public.social_posts for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ===== 8. WHATSAPP_POSTS (distribuição manual/oficial por oferta) =====
-- NÃO é disparo automático: curadoria humana (copiar) ou Cloud API oficial.
create table if not exists public.whatsapp_posts (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references public.offers(id) on delete set null,
  message text,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'cancelled')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_posts_offer_idx on public.whatsapp_posts(offer_id);
create index if not exists whatsapp_posts_status_idx on public.whatsapp_posts(status);

alter table public.whatsapp_posts enable row level security;

drop policy if exists "Admin gerencia whatsapp_posts" on public.whatsapp_posts;
create policy "Admin gerencia whatsapp_posts"
on public.whatsapp_posts for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ===== 9. SETTINGS (config do site; chaves secretas NUNCA aqui) =====
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "Admin gerencia settings" on public.settings;
create policy "Admin gerencia settings"
on public.settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.settings (key, value) values
  ('site', '{"name": "AchadinhosBR"}'::jsonb)
on conflict (key) do nothing;

-- ===== 10. VIEW de apoio ao painel/dashboard V3 =====
drop view if exists public.v3_offer_stats;
create view public.v3_offer_stats
with (security_invoker = true)
as
select
  o.id,
  o.slug,
  o.status,
  o.score,
  o.score_level,
  o.current_price,
  o.old_price,
  o.discount_percentage,
  o.featured,
  o.published_at,
  o.expires_at,
  p.title,
  p.image,
  p.marketplace,
  p.affiliate_url,
  count(c.id)::bigint as clicks
from public.offers o
join public.products p on p.id = o.product_id
left join public.clicks c on c.offer_id = o.id
group by o.id, p.title, p.image, p.marketplace, p.affiliate_url
order by o.score desc;
