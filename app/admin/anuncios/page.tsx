import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CANAIS, rotuloOrigem } from "@/lib/canais";

type SP = { q?: string; periodo?: string; canal?: string };

export default async function CentralAnuncios({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const periodo = sp.periodo || "30";
  const canal = sp.canal || "";
  const supabase = await createClient();

  let qry = supabase.from("anuncios").select("*, produtos!inner(nome)").order("created_at", { ascending: false }).limit(200);
  if (periodo !== "todos") {
    const dias = periodo === "7" ? 7 : 30;
    qry = qry.gte("created_at", new Date(Date.now() - dias * 24 * 3600 * 1000).toISOString());
  }
  if (canal) qry = qry.eq("campanha", canal);
  if (q) qry = qry.ilike("produtos.nome", `%${q}%`);
  const { data } = await qry;
  const lista = data ?? [];

  // Cliques por criativo (comparar modelos na prática, sem inventar vendas).
  const ids = lista.map((a: any) => a.id);
  const porAnuncio = new Map<string, number>();
  if (ids.length > 0) {
    const { data: cliques } = await supabase.from("cliques").select("anuncio_id").in("anuncio_id", ids).limit(5000);
    for (const c of cliques ?? []) {
      if (c.anuncio_id) porAnuncio.set(c.anuncio_id, (porAnuncio.get(c.anuncio_id) ?? 0) + 1);
    }
  }

  return <>
    <div className="sectionHeader"><h1>📣 Central de Anúncios</h1>
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href="/admin/anuncios/novo" className="cta">🪄 Gerar anúncio</Link>
        <Link href="/admin/anuncios/lote" className="secondary" style={{ textDecoration: "none" }}>🖼️ Gerar 5 artes</Link>
      </div></div>
    <form className="sortBar" method="get" action="/admin/anuncios" aria-label="Filtrar anúncios">
      <div className="field"><label htmlFor="f-q">Produto</label><input id="f-q" name="q" defaultValue={q} placeholder="Nome do produto" /></div>
      <div className="field"><label htmlFor="f-per">Período</label><select id="f-per" name="periodo" defaultValue={periodo}>
        <option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="todos">Todos</option>
      </select></div>
      <div className="field"><label htmlFor="f-canal">Canal</label><select id="f-canal" name="canal" defaultValue={canal}>
        <option value="">Todos</option>
        {CANAIS.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
      </select></div>
      <div className="actions" style={{ marginTop: 0 }}><button className="secondary" type="submit">Aplicar</button></div>
    </form>
    <div className="tableWrap"><table className="table"><thead><tr><th>Data</th><th>Produto</th><th>Formato</th><th>Modelo</th><th>Campanha</th><th>Cliques</th><th>Status</th></tr></thead>
      <tbody>{lista.map((a: any) => <tr key={a.id}>
        <td>{new Date(a.created_at).toLocaleDateString("pt-BR")}</td>
        <td>{a.produtos?.nome ?? a.produto_id}</td>
        <td>{a.formato}</td><td>{a.modelo}</td>
        <td>{a.campanha ? rotuloOrigem(a.campanha) : "—"}</td>
        <td>{porAnuncio.get(a.id) ?? 0}</td>
        <td>Ativo</td>
      </tr>)}
      {lista.length === 0 && <tr><td colSpan={7}>Nenhum anúncio gerado com estes filtros.</td></tr>}</tbody></table></div>
    <div className="notice">Cliques contam interesse real no criativo. Não significam vendas nem comissões.</div>
  </>;
}
