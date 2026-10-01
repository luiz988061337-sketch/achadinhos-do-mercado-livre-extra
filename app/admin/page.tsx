import { createClient } from "@/lib/supabase/server";
import { rotuloOrigem } from "@/lib/canais";

function inicioDiaUTC(diasAtras = 0) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - diasAtras);
  return d.toISOString();
}

export default async function Admin() {
  const supabase = await createClient();
  const hoje = inicioDiaUTC(0);
  const ontem = inicioDiaUTC(1);
  const ha7 = inicioDiaUTC(7);
  const ha30 = inicioDiaUTC(30);
  const ha14 = inicioDiaUTC(13);

  const [
    { count: totalProdutos },
    { count: ativos },
    { count: totalCliques },
    { count: cliquesHoje },
    { count: cliquesOntem },
    { count: cliques7 },
    { count: cliques30 },
    { data: linhas },
    { data: produtos }
  ] = await Promise.all([
    supabase.from("produtos").select("*", { count: "exact", head: true }),
    supabase.from("produtos").select("*", { count: "exact", head: true }).eq("ativo", true),
    supabase.from("cliques").select("*", { count: "exact", head: true }),
    supabase.from("cliques").select("*", { count: "exact", head: true }).gte("criado_em", hoje),
    supabase.from("cliques").select("*", { count: "exact", head: true }).gte("criado_em", ontem).lt("criado_em", hoje),
    supabase.from("cliques").select("*", { count: "exact", head: true }).gte("criado_em", ha7),
    supabase.from("cliques").select("*", { count: "exact", head: true }).gte("criado_em", ha30),
    supabase.from("cliques").select("produto_id, criado_em, origem").gte("criado_em", ha30).limit(5000),
    supabase.from("produtos").select("id, nome, categoria")
  ]);

  const nomes = new Map((produtos ?? []).map((p: any) => [p.id, { nome: p.nome, categoria: p.categoria }]));
  const porProduto = new Map<string, number>();
  const porCategoria = new Map<string, number>();
  const porOrigem = new Map<string, number>();
  const porDia = new Map<string, number>();
  for (const c of linhas ?? []) {
    porProduto.set(c.produto_id, (porProduto.get(c.produto_id) ?? 0) + 1);
    const cat = nomes.get(c.produto_id)?.categoria ?? "Outros";
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + 1);
    const org = (c.origem || "ACHADINHOS_SITE").toUpperCase();
    porOrigem.set(org, (porOrigem.get(org) ?? 0) + 1);
    const dia = new Date(c.criado_em).toISOString().slice(0, 10);
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
  }
  const topProdutos = [...porProduto.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topCategorias = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topOrigens = [...porOrigem.entries()].sort((a, b) => b[1] - a[1]);
  const dias: { rotulo: string; n: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const chave = d.toISOString().slice(0, 10);
    dias.push({ rotulo: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), n: porDia.get(chave) ?? 0 });
  }
  const maxDia = Math.max(1, ...dias.map((d) => d.n));
  void ha14;

  return <>
    <h1>📊 Dashboard</h1>
    <p>Interesse real medido em cliques. Cliques não significam vendas nem comissões.</p>

    <h2>📦 Produtos</h2>
    <div className="adminGrid">
      <div className="stat">Total<strong>{totalProdutos ?? 0}</strong></div>
      <div className="stat">Ativos<strong>{ativos ?? 0}</strong></div>
      <div className="stat">Inativos<strong>{(totalProdutos ?? 0) - (ativos ?? 0)}</strong></div>
      <div className="stat">Comissões<strong style={{ fontSize: 14 }}>Consulte a Central de Afiliados do Mercado Livre para vendas e comissões.</strong></div>
    </div>

    <h2>🖱️ Cliques</h2>
    <div className="adminGrid">
      <div className="stat">Hoje<strong>{cliquesHoje ?? 0}</strong></div>
      <div className="stat">Ontem<strong>{cliquesOntem ?? 0}</strong></div>
      <div className="stat">Últimos 7 dias<strong>{cliques7 ?? 0}</strong></div>
      <div className="stat">Últimos 30 dias<strong>{cliques30 ?? 0}</strong></div>
    </div>
    <div className="notice">Total geral: <strong>{totalCliques ?? 0}</strong> cliques. Contagem em dias UTC.</div>

    <h2>📈 Evolução (14 dias)</h2>
    <div className="bars" role="img" aria-label="Gráfico de cliques por dia nos últimos 14 dias">
      {dias.map((d) => <div key={d.rotulo} className="barCol" title={`${d.rotulo}: ${d.n}`}>
        <div className="bar" style={{ height: `${Math.max(4, Math.round((d.n / maxDia) * 100))}px` }} />
        <span>{d.rotulo}</span><strong>{d.n}</strong>
      </div>)}
    </div>

    <h2>🏆 Produtos mais clicados (30 dias)</h2>
    <div className="tableWrap"><table className="table"><thead><tr><th>Produto</th><th>Cliques</th></tr></thead>
      <tbody>{topProdutos.map(([id, n]) => <tr key={id}><td>{nomes.get(id)?.nome ?? id}</td><td>{n}</td></tr>)}
      {topProdutos.length === 0 && <tr><td colSpan={2}>Sem cliques no período.</td></tr>}</tbody></table></div>

    <h2>🗂️ Categorias mais clicadas (30 dias)</h2>
    <div className="tableWrap"><table className="table"><thead><tr><th>Categoria</th><th>Cliques</th></tr></thead>
      <tbody>{topCategorias.map(([c, n]) => <tr key={c}><td>{c}</td><td>{n}</td></tr>)}
      {topCategorias.length === 0 && <tr><td colSpan={2}>Sem cliques no período.</td></tr>}</tbody></table></div>

    <h2>📣 Campanhas e canais (30 dias)</h2>
    <div className="tableWrap"><table className="table"><thead><tr><th>Origem</th><th>Cliques</th></tr></thead>
      <tbody>{topOrigens.map(([o, n]) => <tr key={o}><td>{rotuloOrigem(o)} ({o})</td><td>{n}</td></tr>)}
      {topOrigens.length === 0 && <tr><td colSpan={2}>Sem cliques no período.</td></tr>}</tbody></table></div>
  </>;
}
