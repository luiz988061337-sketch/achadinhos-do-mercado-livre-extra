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
