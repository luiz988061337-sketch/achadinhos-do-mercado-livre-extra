# AchadinhosBR V2 — Next.js + Supabase

Plataforma de afiliados do Mercado Livre: curadoria de ofertas, saída
transparente para o ML e métricas de cliques por produto/canal.

## Recursos

- Next.js + Supabase Database + Auth por e-mail/senha
- Painel administrativo protegido (RLS por tabela `admin_users` + checagem no layout)
- Cadastro, edição, ativação e exclusão de produtos
- Validação de link de afiliado (bloqueia homepage, busca, carrinho, links genéricos)
- Importação assistida: cola o link, valida e extrai o ID do anúncio (MLB...)
- Fluxo de saída `/sair/[id]`: registra o clique e mostra o destino antes de continuar (sem redirect automático)
- Rastreamento de cliques (produto, data/hora, origem, canal, sessão anônima)
- Dashboard com métricas e gráficos: hoje/ontem/7d/30d, top produtos, categorias, canais
- Carrossel de destaques + seção "Em alta" (mais clicados, dados reais)
- Compartilhamento (WhatsApp/Telegram/Facebook/copiar + Web Share API) com etiqueta de canal
- Páginas de campanha `/campanha/[canal]` com canonical para `/ofertas`
- Paginação e ordenação (recentes, desconto, preço, mais clicados) em ofertas e categorias
- SEO: metadata, Open Graph, canonical, JSON-LD, sitemap, robots, favicon
- Páginas: Sobre, Como funciona, Aviso de afiliado, Contato, Privacidade, Termos

## 1. Criar projeto no Supabase

Crie um projeto no Supabase.

Instalação nova: abra **SQL Editor**, cole todo o conteúdo de:

`supabase/schema.sql`

e execute.

Banco existente (v1/v2): execute `supabase/migracao-v3.sql` UMA vez, na ordem
do arquivo. Ele cria `admin_users`, adiciona as colunas novas, desativa os
produtos de exemplo com link genérico (mostra quais no resultado) e cadastra
o administrador pelo e-mail.

## 2. Criar o usuário administrador

No Supabase:
**Authentication → Users → Add user**

Crie seu e-mail e senha. Depois garanta o registro em `admin_users`:

```sql
insert into public.admin_users (user_id, role)
select id, 'admin' from auth.users where email = 'voce@exemplo.com'
on conflict (user_id) do nothing;
```

Somente quem está em `admin_users` passa nas policies de escrita. A checagem
de e-mail no `app/admin/layout.tsx` (`ADMIN_EMAILS`) é defesa extra, não a
proteção real — a proteção real é o RLS.

## 3. Variáveis de ambiente

Copie `.env.example` para `.env.local`:

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ADMIN_EMAILS=voce@exemplo.com

Pegue esses valores em:
Supabase → Project Settings → API.

NÃO coloque a Service Role Key em `NEXT_PUBLIC_*`.

## 4. Rodar

```bash
npm install
npm run dev
```

Abra:
http://localhost:3000

Painel:
http://localhost:3000/admin

## 5. GitHub + Vercel

Suba o projeto para GitHub e importe o repositório na Vercel.

Na Vercel, adicione as mesmas duas variáveis:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Depois faça redeploy.
## 6. Como funciona o rastreamento

Os botões de oferta apontam para:

`/sair/ID_DO_PRODUTO`

A página de saída:

1. registra o clique (produto, data/hora, página de origem, canal `?origem=`, sessão anônima);
2. mostra o produto e o destino no Mercado Livre com transparência;
3. só leva ao link de afiliado se o visitante clicar em continuar.

`/go/ID_DO_PRODUTO` existe por compatibilidade e só encaminha para `/sair`.

Canais suportados (`?origem=`): ACHADINHOS_SITE, ACHADINHOS_INSTAGRAM,
ACHADINHOS_TIKTOK, ACHADINHOS_WHATSAPP, ACHADINHOS_FACEBOOK,
ACHADINHOS_YOUTUBE, ACHADINHOS_PINTEREST. Páginas de campanha:
`/campanha/[canal]`.

## 8. Central de Anúncios 📣

- **🪄 Gerar anúncio** (na linha do produto ou em `/admin/anuncios/novo`):
  escolhe produto, formato (Feed/Stories/WhatsApp/Pinterest), modelo (A/B/C)
  e canal. Gera arte em canvas no navegador (sem API externa), 5 versões de
  texto só com dados reais, download PNG, compartilhar (Web Share API),
  copiar texto/link. **Salvar no histórico** gera o link medido
  (`/sair/ID?origem=CANAL&anuncio=ID`).
- **🖼️ Gerar 5 artes** (`/admin/anuncios/lote`): selecione exatamente 5
  produtos, distribua modelos A/B/C, baixe individual ou tudo em ZIP
  (`achadinhobr-produto-01..05.png`), "Gerar novamente" alterna os modelos.
  Produtos sem imagem/preço válido são bloqueados com o motivo.
- **Central** (`/admin/anuncios`): histórico com produto, formato, modelo,
  campanha, data e **cliques por criativo** (via `cliques.anuncio_id`),
  com filtros por produto, período e canal. Cliques ≠ vendas.
- Segurança: tabela `anuncios` com RLS só-admin (`is_admin()`); sem acesso público.
- Dependência nova: `jszip` (MIT, gratuita) para o ZIP.

## 7. Segurança

A senha nunca fica no código.
A autenticação é feita pelo Supabase.
As tabelas usam Row Level Security com `admin_users` + `is_admin()`.
Não guardamos IP original (só hash) nem dados pessoais além do necessário.
Cliques não significam vendas: consulte a Central de Afiliados do ML.

## V4 — Marketplaces (ML + Shopee), score, aprovação, WhatsApp

Estrutura nova convivendo com o legado (`produtos`/`cliques` intactos).
Tabelas novas: `products`, `clicks`, `whatsapp_queue`, `whatsapp_logs`.
Instalação: execute `supabase/migracao-v4.sql` UMA vez no SQL Editor.

- **ML (API oficial, só leitura):** `/admin/v4/pesquisar` → `GET /api/v4/ml/search?q=` →
  `POST /api/v4/ml/import`. Salva `pending`, `affiliate_url=NULL` (cole o oficial
  na aprovação). Nunca converte link comum em afiliado.
  Requer app oficial: crie em developers.mercadolivre.com.br e configure
  `ML_CLIENT_ID` + `ML_CLIENT_SECRET` no servidor (o token é obtido sozinho).
- **Shopee (Affiliate Open API, server-only):** mesmas telas com marketplace
  `shopee`. `affiliate_url` vem da API; sem `SHOPEE_APP_ID/SECRET` a busca
  retorna 428 com instrução. Secrets nunca vão ao frontend.
- **Score 0-100** (`lib/score.ts`): desconto 30 + avaliação 20 + vendas 20 +
  preço 15 + comissão 15 (+5 bônus). Visível no painel e nos cards V4.
- **Aprovação:** `/admin/v4/pendentes` → Publicar (exige affiliate oficial) /
  Rejeitar / Fila WA. Só `approved` aparece no site (`/` e `/ofertas`).
- **Rastreamento:** `/ver/[id]?origem=` registra em `clicks` (produto,
  marketplace, data/hora, referer, user-agent, hash IP) e redireciona ao
  `affiliate_url`. `/sair/[id]` legado preservado.
- **WhatsApp:** `/admin/v4/whatsapp` (fila + logs). Sem automação não oficial;
  envio só via Cloud API oficial (`WHATSAPP_ACCESS_TOKEN/PHONE_ID`).
- **Painel:** `/admin/v4` → publicados, pendentes, cliques, por marketplace,
  top score.
- **Automação:** `GET /api/cron/pesquisar?secret=` e
  `GET /api/cron/atualizar-precos?secret=` (header `Authorization: Bearer`
  também vale). Exigem `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` no servidor.
  Agendados em `vercel.json` (9h pesquisa, 9h30 preços — a Vercel envia o
  `CRON_SECRET` como Bearer sozinha).
  Nunca publicam sozinhos (`ALLOW_AUTO_PUBLISH` ignorado sem affiliate oficial;
  novos entram `pending`).

### Env Vercel (V4)

Obrigatórias: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`ADMIN_EMAILS`, `SUPABASE_SERVICE_ROLE_KEY` (só servidor), `CRON_SECRET`.
Opcionais: `SHOPEE_APP_ID`, `SHOPEE_APP_SECRET`, `SHOPEE_API_BASE`,
`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TEST_TO`,
`CRON_TERMOS`, `ALLOW_AUTO_PUBLISH=false`. Ver `.env.example`.

### Google Search Console

1. Acesse `search.google.com/search-console` → Adicionar propriedade (`https://achadinhos-nine.vercel.app`).
2. Verificação por **tag HTML**: copie o código, configure na Vercel `GOOGLE_SITE_VERIFICATION=codigo` → Redeploy.
3. Envie o sitemap: `https://achadinhos-nine.vercel.app/sitemap.xml`.

### Comparar ofertas

`/comparar`: busque produtos do site, adicione até 3 e compare preço, desconto,
avaliação, loja e score (menor preço destacado). Dados: `GET /api/v4/site/buscar?q=`
(só visíveis: V4 aprovados + legados ativos).

## Próximas melhorias

- Importação de produtos
- Atualização automática de preço
- Estatísticas por dia/semana/mês
- Gráfico de cliques
- Controle de comissão
- SEO e sitemap
- Google Search Console
- Página de comparação de produtos
- Integração com fontes oficiais de produtos/afiliados conforme as regras vigentes
