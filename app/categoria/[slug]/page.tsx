import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { categorias } from "@/lib/categorias";
import { createClient } from "@/lib/supabase/server";
import { POR_PAGINA, ORDENACOES, lerOrdem, lerPagina, hrefLista } from "@/lib/listagem";

type SP = { pagina?: string; ordem?: string };

export default async function Categoria({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const categoria = categorias.find((c) => c.slug === slug);
  if (!categoria) notFound();

  const ordem = lerOrdem(sp.ordem);
  const pagina = lerPagina(sp.pagina);
  const supabase = await createClient();

  let lista: any[] = [];
  let total = 0;

  if (ordem === "cliques") {
    const { data: top } = await supabase.from("produto_cliques").select("id").limit(300);
    const ids = (top ?? []).map((t: any) => t.id);
    if (ids.length > 0) {
      const { data } = await supabase.from("produtos").select("*").in("id", ids).eq("ativo", true).eq("categoria_slug", slug);
      const pos = new Map(ids.map((id: string, i: number) => [id, i]));
      lista = (data ?? []).sort((a: any, b: any) => (pos.get(a.id) ?? 9999) - (pos.get(b.id) ?? 9999));
    }
    total = lista.length;
    lista = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  } else {
    let base = supabase.from("produtos").select("*", { count: "exact" }).eq("ativo", true).eq("categoria_slug", slug);
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
  const base = `/categoria/${slug}`;

  return <div className="container">
    <div className="pageTitle">
      <div className="breadcrumb">Início / Categorias / {categoria.nome}</div>
      <h1>{categoria.icone} {categoria.nome}</h1>
      <p aria-live="polite">{total === 0 ? "Ainda não há produtos cadastrados nesta categoria." : `${total} ${total === 1 ? "produto" : "produtos"} — página ${pag} de ${totalPaginas}.`}</p>
    </div>
    {total > 0 ? <form className="sortBar" method="get" action={base} aria-label="Ordenar produtos">
      <div className="field"><label htmlFor="f-ordem">Ordenar por</label>
        <select id="f-ordem" name="ordem" defaultValue={ordem}>
          {ORDENACOES.map((o) => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
        </select></div>
      <div className="actions" style={{ marginTop: 0 }}><button className="secondary" type="submit">Aplicar</button></div>
    </form> : null}
    <div className="products">{lista.map((p) => <ProductCard key={p.id} produto={p} />)}</div>
    {totalPaginas > 1 ? <nav className="pager" aria-label="Paginação">
      {pag > 1 ? <Link className="secondary" style={{ textDecoration: "none" }} href={hrefLista(base, { ordem, pagina: String(pag - 1) })}>← Anterior</Link> : null}
      <span>Página {pag} de {totalPaginas}</span>
      {pag < totalPaginas ? <Link className="secondary" style={{ textDecoration: "none" }} href={hrefLista(base, { ordem, pagina: String(pag + 1) })}>Próxima →</Link> : null}
    </nav> : null}
  </div>;
}
