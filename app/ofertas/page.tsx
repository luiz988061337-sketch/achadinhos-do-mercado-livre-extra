import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ProductCardV4 from "@/components/ProductCardV4";
import { categorias } from "@/lib/categorias";
import { createClient } from "@/lib/supabase/server";
import { POR_PAGINA, ORDENACOES, lerOrdem, lerPagina, hrefLista } from "@/lib/listagem";

type SP = { q?: string; pagina?: string; ordem?: string; categoria?: string };

export default async function Ofertas({ searchParams }: { searchParams: Promise<SP> }) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const ordem = lerOrdem(params.ordem);
  const pagina = lerPagina(params.pagina);
  const catFiltro = params.categoria || "";
  const supabase = await createClient();

  let lista: any[] = [];
  let total = 0;

  if (ordem === "cliques") {
    // Ranking por cliques reais (todos os períodos, via view).
    const { data: top } = await supabase.from("produto_cliques").select("id").limit(300);
    const ids = (top ?? []).map((t: any) => t.id);
    if (ids.length > 0) {
      let qry = supabase.from("produtos").select("*").in("id", ids).eq("ativo", true);
      if (catFiltro) qry = qry.eq("categoria_slug", catFiltro);
      if (q) qry = qry.ilike("nome", `%${q}%`);
      const { data } = await qry;
      const pos = new Map(ids.map((id: string, i: number) => [id, i]));
      lista = (data ?? []).sort((a: any, b: any) => (pos.get(a.id) ?? 9999) - (pos.get(b.id) ?? 9999));
    }
    total = lista.length;
    lista = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  } else {
    let base = supabase.from("produtos").select("*", { count: "exact" }).eq("ativo", true);
    if (catFiltro) base = base.eq("categoria_slug", catFiltro);
    if (q) base = base.ilike("nome", `%${q}%`);
    if (ordem === "desconto") base = base.order("desconto", { ascending: false, nullsFirst: false });
    else if (ordem === "preco-asc") base = base.order("preco", { ascending: true });
    else if (ordem === "preco-desc") base = base.order("preco", { ascending: false });
    base = base.order("created_at", { ascending: false });
    const { data, count } = await base.range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
    lista = data ?? [];
    total = count ?? 0;
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pag = Math.min(pagina, totalPaginas);
  const comuns = { q: q || undefined, ordem, categoria: catFiltro || undefined };

  // V4: somente aprovados (products.status=approved). Não altera a lista legada.
  // Mostra na 1ª página como vitrine nova, com rastreio via /ver/[id].
  let v4lista: any[] = [];
  if (pagina === 1) {
    let v4qry = supabase.from("products").select("*").eq("status", "approved").order("score", { ascending: false }).limit(12);
    if (q) v4qry = v4qry.ilike("title", `%${q}%`);
    const { data: v4data } = await v4qry;
    v4lista = v4data ?? [];
  }

  return <div className="container">
    <div className="pageTitle">
      <h1>{q ? `🔎 Resultados para "${q}"` : "🔥 Ofertas de hoje"}</h1>
      <p aria-live="polite">{total === 0 ? "Nenhum produto encontrado." : `${total} ${total === 1 ? "achadinho" : "achadinhos"} — página ${pag} de ${totalPaginas}.`}</p>
    </div>
    <form className="sortBar" method="get" action="/ofertas" role="search" aria-label="Filtrar ofertas">
      {q ? <input type="hidden" name="q" value={q} /> : null}
      <div className="field"><label htmlFor="f-categoria">Categoria</label>
        <select id="f-categoria" name="categoria" defaultValue={catFiltro}>
          <option value="">Todas</option>
          {categorias.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}
        </select></div>
      <div className="field"><label htmlFor="f-ordem">Ordenar por</label>
        <select id="f-ordem" name="ordem" defaultValue={ordem}>
          {ORDENACOES.map((o) => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
        </select></div>
      <div className="actions" style={{ marginTop: 0 }}><button className="secondary" type="submit">Aplicar</button></div>
    </form>
    <div className="products">{lista.map((p) => <ProductCard key={p.id} produto={p} />)}</div>
    {v4lista.length > 0 ? <>
      <div className="pageTitle" style={{ marginTop: 24 }}>
        <h2>🆕 Novas ofertas (ML + Shopee) — aprovadas</h2>
        <p>Rastreamento via /ver · score 0-100 · somente aprovadas aparecem aqui.</p>
      </div>
      <div className="products">{v4lista.map((p) => <ProductCardV4 key={p.id} produto={p} />)}</div>
    </> : null}
    {totalPaginas > 1 ? <nav className="pager" aria-label="Paginação">
      {pag > 1 ? <Link className="secondary" style={{ textDecoration: "none" }} href={hrefLista("/ofertas", { ...comuns, pagina: String(pag - 1) })}>← Anterior</Link> : null}
      <span>Página {pag} de {totalPaginas}</span>
      {pag < totalPaginas ? <Link className="secondary" style={{ textDecoration: "none" }} href={hrefLista("/ofertas", { ...comuns, pagina: String(pag + 1) })}>Próxima →</Link> : null}
    </nav> : null}
  </div>;
}
