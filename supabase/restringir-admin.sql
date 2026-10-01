-- ACHADINHOSBR V2 — Restringir administração a e-mail específico
-- Execute este arquivo no SQL Editor do Supabase (depois do schema.sql).
--
-- Mantém público:
--   - leitura de produtos ativos (visitantes)
--   - registro de cliques (botão "Ver oferta")
-- Restringe ao e-mail abaixo:
--   - ler todos os produtos, inserir, atualizar, excluir
--   - ler cliques (dashboard)

drop policy if exists "Admin lê produtos" on public.produtos;
create policy "Admin lê produtos"
on public.produtos for select
to authenticated
using ((auth.jwt() ->> 'email') = 'luiz988061337@gmail.com');

drop policy if exists "Admin insere produtos" on public.produtos;
create policy "Admin insere produtos"
on public.produtos for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'luiz988061337@gmail.com');

drop policy if exists "Admin atualiza produtos" on public.produtos;
create policy "Admin atualiza produtos"
on public.produtos for update
to authenticated
using ((auth.jwt() ->> 'email') = 'luiz988061337@gmail.com')
with check ((auth.jwt() ->> 'email') = 'luiz988061337@gmail.com');

drop policy if exists "Admin exclui produtos" on public.produtos;
create policy "Admin exclui produtos"
on public.produtos for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'luiz988061337@gmail.com');

drop policy if exists "Admin lê cliques" on public.cliques;
create policy "Admin lê cliques"
on public.cliques for select
to authenticated
using ((auth.jwt() ->> 'email') = 'luiz988061337@gmail.com');
