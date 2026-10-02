import { createClient } from "@/lib/supabase/server";
import { CANAIS, rotuloOrigem } from "@/lib/canais";

function inicioDiaUTC(diasAtras = 0) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - diasAtras);
  return d.toISOString();
}

function formatarVariacao(atual: number, anterior: number): string {
  if (anterior <= 0) return atual > 0 ? "+100%*" : "—";
  const pct = ((atual - anterior) / anterior) * 100;
  const sinal = pct > 0 ? "+" : "";
  return `${sinal}${pct.toFixed(1)}%`;
}

type SP = { periodo?: string; canal?: string };

const PERIODOS_VALIDOS = ["7", "14", "30", "90"] as const;

export default async function Admin({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const periodo = PERIODOS_VALIDOS.includes(sp.periodo as any) ? (sp.periodo as string) : "30";
  const diasPeriodo = parseInt(periodo, 10);
  const canal = CANAIS.some((c) => c.id === sp.canal) ? (sp.canal as string) : "";
  const supabase = await createClient();
  const hoje = inicioDiaUTC(0);
  const ontem = inicioDiaUTC(1);
  const inicioPeriodo = inicioDiaUTC(diasPeriodo);
  const inicioAnterior = inicioDiaUTC(diasPeriodo * 2);
  const fimAnterior = inicioDiaUTC(diasPeriodo);

  const aplicarCanal = (qry: any) => (canal ? qry.eq("origem", canal) : qry);

  const [
    { count: totalProdutos },
    { count: ativos },
    { count: totalCliques },
    { count: cliquesHoje },
    { count: cliquesOntem },
    { count: cliquesPeriodo },
    { count: cliquesAnterior },
    { data: linhas },
    { data: produtos }
  ] = await Promise.all([
    supabase.from("produtos").select("*", { count: "exact", head: true }),
    supabase.from("produtos").select("*", { count: "exact", head: true }).eq("ativo", true),
    supabase.from("cliques").select("*", { count: "exact", head: true }),
    aplicarCanal(supabase.from("cliques").select("*", { count: "exact", head: true }).gte("criado_em", hoje)),
    aplicarCanal(supabase.from("cliques").select("*", { count: "exact", head: true }).gte("criado_em", ontem).lt("criado_em", hoje)),
    aplicarCanal(supabase.from("cliques").select("*", { count: "exact", head: true }).gte("criado_em", inicioPeriodo)),
    aplicarCanal(supabase.from("cliques").select("*", { count: "exact", head: true }).gte("criado_em", inicioAnterior).lt("criado_em", fimAnterior)),
    aplicarCanal(supabase.from("cliques").select("produto_id, criado_em, origem, sessao_id, anuncio_id").gte("criado_em", inicioPeriodo).limit(10000)),
    supabase.from("produtos").select("id, nome, categoria")
  ]);

  const nomes = new Map((produtos ?? []).map((p: any) => [p.id, { nome: p.nome, categoria: p.categoria }]));
  const porProduto = new Map<string, number>();
  const porCategoria = new Map<string, number>();
  const porOrigem = new Map<string, number>();
  const porDia = new Map<string, number>();
  const porAnuncio = new Map<string, number>();
  const sessoes = new Set<string>();
  for (const c of linhas ?? []) {
    porProduto.set(c.produto_id, (porProduto.get(c.produto_id) ?? 0) + 1);
    const cat = nomes.get(c.produto_id)?.categoria ?? "Outros";
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + 1);
    const org = (c.origem || "ACHADINHOS_SITE").toUpperCase();
    porOrigem.set(org, (porOrigem.get(org) ?? 0) + 1);
    const dia = new Date(c.criado_em).toISOString().slice(0, 10);
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
    if (c.sessao_id) sessoes.add(c.sessao_id);
    if (c.anuncio_id) porAnuncio.set(c.anuncio_id, (porAnuncio.get(c.anuncio_id) ?? 0) + 1);
  }
  const totalPeriodo = cliquesPeriodo ?? 0;
  const topProdutos = [...porProduto.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topCategorias = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topOrigens = [...porOrigem.entries()].sort((a, b) => b[1] - a[1]);
  const topAnunciosIds = [...porAnuncio.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  let nomesAnuncios = new Map<string, string>();
  if (topAnunciosIds.length > 0) {
    const { data: anuncios } = await supabase
      .from("anuncios")
      .select("id, formato, modelo, campanha, produto_id")
      .in("id", topAnunciosIds.map(([id]) => id));
    for (const a of anuncios ?? []) {
      const nomeProduto = nomes.get((a as any).produto_id)?.nome ?? "Produto";
      nomesAnuncios.set((a as any).id, `${nomeProduto} · ${(a as any).formato}/${(a as any).modelo}`);
    }
  }
  const dias: { rotulo: string; n: number }[] = [];
  for (let i = diasPeriodo - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const chave = d.toISOString().slice(0, 10);
    dias.push({ rotulo: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), n: porDia.get(chave) ?? 0 });
  }
  const maxDia = Math.max(1, ...dias.map((d) => d.n));
  const pct = (n: number) => (totalPeriodo > 0 ? `${((n / totalPeriodo) * 100).toFixed(1)}%` : "—");

  return <>
    <h1>📊 Dashboard</h1>
    <p>Interesse real medido em cliques. Cliques não significam vendas nem comissões.</p>

    <form className="sortBar" method="get" action="/admin" aria-label="Filtrar dashboard">
      <div className="field"><label htmlFor="f-periodo">Período</label><select id="f-periodo" name="periodo" defaultValue={periodo}>
        <option value="7">Últimos 7 dias</option><option value="14">Últimos 14 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option>
      </select></div>
      <div className="field"><label htmlFor="f-canal">Canal</label><select id="f-canal" name="canal" defaultValue={canal}>
        <option value="">Todos</option>
        {CANAIS.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
      </select></div>
      <div className="actions" style={{ marginTop: 0 }}><button className="secondary" type="submit">Aplicar</button></div>
    </form>

    <h2>📦 Produtos</h2>
    <div className="adminGrid">
      <div className="stat">Total<strong>{totalProdutos ?? 0}</strong></div>
      <div className="stat">Ativos<strong>{ativos ?? 0}</strong></div>
      <div className="stat">Inativos<strong>{(totalProdutos ?? 0) - (ativos ?? 0)}</strong></div>
      <div className="stat">Comissões<strong style={{ fontSize: 14 }}>Consulte a Central de Afiliados do Mercado Livre para vendas e comissões.</strong></div>
    </div>

    <h2>🖱️ Cliques{canal ? ` · ${rotuloOrigem(canal)}` : ""} (últimos {diasPeriodo} dias)</h2>
    <div className="adminGrid">
      <div className="stat">Hoje<strong>{cliquesHoje ?? 0}</strong><span style={{ fontSize: 12, color: "#595959" }}>Ontem: {cliquesOntem ?? 0} · {formatarVariacao(cliquesHoje ?? 0, cliquesOntem ?? 0)}</span></div>
      <div className="stat">Período<strong>{totalPeriodo}</strong><span style={{ fontSize: 12, color: "#595959" }}>Anterior: {cliquesAnterior ?? 0} · {formatarVariacao(totalPeriodo, cliquesAnterior ?? 0)}</span></div>
      <div className="stat">Sessões únicas<strong>{sessoes.size}</strong><span style={{ fontSize: 12, color: "#595959" }}>Em {totalPeriodo} cliques no período</span></div>
      <div className="stat">Total geral<strong>{totalCliques ?? 0}</strong><span style={{ fontSize: 12, color: "#595959" }}>Sem filtro de período/canal</span></div>
    </div>
    <div className="notice">Total no período: <strong>{totalPeriodo}</strong> cliques{canal ? <> no canal <strong>{canal}</strong></> : ""}. Contagem em dias UTC, até 10.000 registros detalhados. Variações com base zero mostram +100%*.</div>

    <h2>📈 Evolução ({diasPeriodo} dias)</h2>
    <div className="bars" role="img" aria-label={`Gráfico de cliques por dia nos últimos ${diasPeriodo} dias`}>
      {dias.map((d) => <div key={d.rotulo} className="barCol" title={`${d.rotulo}: ${d.n}`}>
        <div className="bar" style={{ height: `${Math.max(4, Math.round((d.n / maxDia) * 100))}px` }} />
        <span>{d.rotulo}</span><strong>{d.n}</strong>
      </div>)}
    </div>

    <h2>🏆 Produtos mais clicados ({diasPeriodo} dias)</h2>
    <div className="tableWrap"><table className="table"><thead><tr><th>Produto</th><th>Categoria</th><th>Cliques</th><th>%</th></tr></thead>
      <tbody>{topProdutos.map(([id, n]) => <tr key={id}><td>{nomes.get(id)?.nome ?? id}</td><td>{nomes.get(id)?.categoria ?? "—"}</td><td>{n}</td><td>{pct(n)}</td></tr>)}
      {topProdutos.length === 0 && <tr><td colSpan={4}>Sem cliques no período.</td></tr>}</tbody></table></div>

    <h2>🗂️ Categorias mais clicadas ({diasPeriodo} dias)</h2>
    <div className="tableWrap"><table className="table"><thead><tr><th>Categoria</th><th>Cliques</th><th>%</th></tr></thead>
      <tbody>{topCategorias.map(([c, n]) => <tr key={c}><td>{c}</td><td>{n}</td><td>{pct(n)}</td></tr>)}
      {topCategorias.length === 0 && <tr><td colSpan={3}>Sem cliques no período.</td></tr>}</tbody></table></div>

    <h2>📣 Campanhas e canais ({diasPeriodo} dias)</h2>
    <div className="tableWrap"><table className="table"><thead><tr><th>Origem</th><th>Cliques</th><th>%</th></tr></thead>
      <tbody>{topOrigens.map(([o, n]) => <tr key={o}><td>{rotuloOrigem(o)} ({o})</td><td>{n}</td><td>{pct(n)}</td></tr>)}
      {topOrigens.length === 0 && <tr><td colSpan={3}>Sem cliques no período.</td></tr>}</tbody></table></div>

    <h2>🎨 Criativos mais clicados ({diasPeriodo} dias)</h2>
    <div className="tableWrap"><table className="table"><thead><tr><th>Criativo</th><th>Cliques</th><th>%</th></tr></thead>
      <tbody>{topAnunciosIds.map(([id, n]) => <tr key={id}><td>{nomesAnuncios.get(id) ?? id}</td><td>{n}</td><td>{pct(n)}</td></tr>)}
      {topAnunciosIds.length === 0 && <tr><td colSpan={3}>Sem cliques com anúncio no período. Use “Salvar no histórico” na Central de Anúncios para medir criativos.</td></tr>}</tbody></table></div>
  </>;
}
