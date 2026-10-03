import { createClient } from "@/lib/supabase/server";

// Dashboard V4 — indicadores novos, sem mexer no dashboard legado (/admin).
// produtos publicados (approved) · pendentes · cliques (V4) · por marketplace · top score.
export default async function AdminV4() {
  const supabase = await createClient();
  const [
    { count: publicados },
    { count: pendentes },
    { count: rejeitados },
    { count: cliques },
    { data: porMp },
    { data: top },
    { data: fila },
    { data: comissoes },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "rejected"),
    supabase.from("clicks").select("*", { count: "exact", head: true }),
    supabase.from("products").select("marketplace"),
    supabase.from("products").select("id,title,marketplace,score,price,status").eq("status", "approved").order("score", { ascending: false }).limit(10),
    supabase.from("whatsapp_queue").select("*", { count: "exact", head: true }).eq("status", "queued"),
    supabase.from("products").select("id,title,marketplace,price,commission,commission_rate").eq("status", "approved").not("commission", "is", null).order("commission", { ascending: false }).limit(10),
  ]);

  const mpCount = new Map<string, number>();
  for (const p of porMp ?? []) mpCount.set(p.marketplace, (mpCount.get(p.marketplace) ?? 0) + 1);

  // Status da oferta V3 por produto (para o painel mostrar se já tem /oferta).
  const topIds = ((top ?? []) as { id: string }[]).map((p) => p.id);
  let ofertaPorProduto = new Map<string, { slug: string | null; status: string; id: string }>();
  if (topIds.length > 0) {
    const { data: offers } = await supabase.from("offers").select("id, product_id, slug, status, created_at").in("product_id", topIds).order("created_at", { ascending: false });
    for (const o of (offers ?? []) as { id: string; product_id: string; slug: string | null; status: string }[]) {
      if (!ofertaPorProduto.has(o.product_id)) ofertaPorProduto.set(o.product_id, { slug: o.slug, status: o.status, id: o.id });
    }
  }

  // Comissão potencial = soma das comissões unitárias dos aprovados (estimativa).
  const comList = (comissoes ?? []) as { id: string; title: string; marketplace: string; price: number; commission: number; commission_rate: number | null }[];
  const totalComissao = comList.reduce((s, p) => s + Number(p.commission || 0), 0);

  return <>
    <h1>🆕 Painel V4 — Marketplaces</h1>
    <p>Modelo novo (<code>products/clicks/whatsapp_*</code>). O painel legado continua em <a href="/admin">/admin</a>.</p>

    <h2>📦 Produtos</h2>
    <div className="adminGrid">
      <div className="stat">Publicados<strong>{publicados ?? 0}</strong></div>
      <div className="stat">Pendentes<strong>{pendentes ?? 0}</strong></div>
      <div className="stat">Rejeitados<strong>{rejeitados ?? 0}</strong></div>
      <div className="stat">Cliques V4<strong>{cliques ?? 0}</strong><span style={{ fontSize: 12 }}>via /ver/[id]</span></div>
    </div>

    <h2>🏪 Ofertas por marketplace</h2>
    <div className="adminGrid">
      <div className="stat">Mercado Livre<strong>{mpCount.get("mercadolivre") ?? 0}</strong></div>
      <div className="stat">Shopee<strong>{mpCount.get("shopee") ?? 0}</strong></div>
      <div className="stat">Fila WhatsApp<strong>{fila ?? 0} na fila</strong></div>
    </div>

    <h2>⭐ Melhores ofertas por score</h2>
    <div className="tableWrap"><table className="table"><thead><tr><th>Título</th><th>Loja</th><th>Score</th><th>Preço</th><th>Oferta V3</th></tr></thead>
      <tbody>
        {(top ?? []).map((p: { id: string; title: string; marketplace: string; score: number; price: number }) => {
          const of = ofertaPorProduto.get(p.id);
          return <tr key={p.id}><td>{p.title}</td><td>{p.marketplace}</td><td>⭐ {p.score}</td><td>R$ {Number(p.price).toFixed(2)}</td><td>{of ? <><a href={`/admin/ofertas/${of.id}`}>{of.status}{of.slug ? ` · /${of.slug.slice(0, 20)}` : ""}</a></> : <a href={`/admin/ofertas/nova?product_id=${p.id}`}>➕ criar</a>}</td></tr>;
        })}
        {(top ?? []).length === 0 && <tr><td colSpan={5}>Nenhum produto aprovado ainda. Vá em Pesquisar.</td></tr>}
      </tbody></table></div>

    <h2>💰 Comissões (estimativa)</h2>
    <div className="adminGrid">
      <div className="stat">Potencial unitário<strong>R$ {totalComissao.toFixed(2)}</strong><span style={{ fontSize: 12 }}>soma por venda de cada aprovado</span></div>
      <div className="stat">Com comissão<strong>{comList.length} produtos</strong></div>
    </div>
    <div className="tableWrap"><table className="table"><thead><tr><th>Título</th><th>Loja</th><th>Taxa</th><th>Comissão</th></tr></thead>
      <tbody>
        {comList.map((p) => <tr key={p.id}><td>{p.title}</td><td>{p.marketplace}</td><td>{p.commission_rate !== null ? `${Number(p.commission_rate).toFixed(1)}%` : "—"}</td><td>R$ {Number(p.commission).toFixed(2)}</td></tr>)}
        {comList.length === 0 && <tr><td colSpan={4}>Sem comissão cadastrada. Produtos Shopee trazem da API; no ML, confira a Central de Afiliados.</td></tr>}
      </tbody></table></div>
    <p className="notice">Estimativa por unidade vendida — cliques ≠ vendas. Vendas e comissões reais: Central de Afiliados de cada marketplace.</p>

    <h2>🧭 Atalhos V4</h2>
    <div className="adminGrid">
      <div className="stat"><a href="/admin/v4/pesquisar">🔎 Pesquisar ofertas</a></div>
      <div className="stat"><a href="/admin/v4/pendentes">✅ Aprovação (pending)</a></div>
      <div className="stat"><a href="/admin/v4/whatsapp">💬 Fila WhatsApp</a></div>
    </div>
  </>;
}
