# AchadinhosBR V2 — Next.js + Supabase

Versão 2 do site de afiliados.

## Recursos

- Next.js
- Supabase Database
- Supabase Auth por e-mail/senha
- Painel administrativo protegido
- Cadastro, edição e exclusão de produtos
- Produtos ativos públicos
- Link intermediário `/go/[id]`
- Rastreamento de cliques
- Dashboard com contagem de cliques
- RLS no Supabase

## 1. Criar projeto no Supabase

Crie um projeto no Supabase.

Depois abra **SQL Editor**, cole todo o conteúdo de:

`supabase/schema.sql`

e execute.

## 2. Criar o usuário administrador

No Supabase:
**Authentication → Users → Add user**

Crie seu e-mail e senha.

Este projeto usa usuários autenticados como administradores. Para um único administrador, é recomendável adicionar uma regra de RLS específica ao seu e-mail antes de colocar o site em produção.

## 3. Variáveis de ambiente

Copie `.env.example` para `.env.local`:

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

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

O botão "VER OFERTA" aponta para:

`/go/ID_DO_PRODUTO`

O servidor:
1. procura o produto;
2. grava um clique;
3. redireciona para o link de afiliado.

## 7. Segurança

A senha nunca fica no código.
A autenticação é feita pelo Supabase.
As tabelas usam Row Level Security.

Antes de colocar em produção, limite as policies administrativas a usuários/roles autorizados.

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
