import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function brl(v: number): string {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function inicioDiaUTC(diasAtras = 0): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - diasAtras);
  return d.toISOString();
}

const PERIODOS = ["7", "30"] as const;

// Dashboard V3 — funil oferta → clique → canal → comissão.
// Cliques NÃO viram vendas: comissão só conta quando lançada e aprovada.
export default async function DashboardV3({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const sp = await searchParams;
  const periodo = PERIODOS.includes(sp.periodo as (typeof PERIODOS)[number]) ? sp.periodo! : "30";
  const dias = parseInt(periodo, 10);
  const inicio = inicioDiaUTC(dias);
  const hoje = inicioDiaUTC(0);
  const supabase = await createClient();

  const [
    { count: totalOfertas },
    { count: publicadas },
    { count: aguardando },
    { count: cliques },
    { count: cliquesHoje },
    { data: linhasCliques },
    { count: views },
    { data: eventos },
    { data: fila },
    { data: comissoes },
    { data: campanhas },
    { count: expiradasPeriodo },
    { data: expiradasRecentes },
  ] = await Promise.all([
    supabase.from("offers").select("*", { count: "exact", head: true }),
    supabase.from("offers").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("offers").select("*", { count: "exact", head: true }).in("status", ["draft", "pending"]),
    supabase.from("clicks").select("*", { count: "exact", head: true }).gte("created_at", inicio).not("offer_id", "is", null),
    supabase.from("clicks").select("*", { count: "exact", head: true }).gte("created_at", hoje).not("offer_id", "is", null),
    supabase.from("clicks").select("offer_id, origin, session_id").gte("created_at", inicio).not("offer_id", "is", null).limit(10000),
    supabase.from("offer_events").select("*", { count: "exact", head: true }).gte("created_at", inicio),
    supabase.from("offer_events").select("tipo").gte("created_at", inicio).limit(10000),
    supabase.from("whatsapp_queue").select("status"),
    supabase.from("commission_records").select("amount, status"),
    supabase.from("campaigns").select("budget, active"),
    supabase.from("offers").select("*", { count: "exact", head: true }).eq("status", "expired").gte("updated_at", inicio),
    supabase.from("offers").select("id, slug, updated_at, expires_at, products(title)").eq("status", "expired").order("updated_at", { ascending: false }).limit(10),
  ]);

  const sessoes = new Set(
    (linhasCliques ?? []).map((c: { session_id: string | null }) => c.session_id).filter(Boolean)
  );
  const porOrigem = new Map<string, number>();
  const porOferta = new Map<string, number>();
  for (const c of (linhasCliques ?? []) as { offer_id: string; origin: string | null }[]) {
    porOrigem.set(c.origin || "—", (porOrigem.get(c.origin || "—") ?? 0) + 1);
    porOferta.set(c.offer_id, (porOferta.get(c.offer_id) ?? 0) + 1);
  }
  const porEvento = new Map<string, number>();
  for (const e of (eventos ?? []) as { tipo: string }[]) {
    porEvento.set(e.tipo, (porEvento.get(e.tipo) ?? 0) + 1);
  }

  const topOfertas = [...porOferta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  let nomes = new Map<string, string>();
  if (topOfertas.length > 0) {
    const { data: ofs } = await supabase
      .from("offers")
      .select("id, products(title)")
      .in(
        "id",
        topOfertas.map(([id]) => id)
      );
    nomes = new Map(
      ((ofs ?? []) as { id: string; products: { title: string } | { title: string }[] | null }[]).map(
        (o) => [
          o.id,
          (Array.isArray(o.products) ? o.products[0]?.title : o.products?.title) ?? o.id,
        ]
      )
    );
  }

  const wa = { queued: 0, sent: 0, failed: 0 };
  for (const q of (fila ?? []) as { status: string }[]) {
    if (q.status in wa) wa[q.status as keyof typeof wa] += 1;
  }
  let comissaoAprovada = 0;
  let comissaoPendente = 0;
  for (const c of (comissoes ?? []) as { amount: number; status: string }[]) {
    if (c.status === "approved") comissaoAprovada += Number(c.amount) || 0;
    else if (c.status === "pending") comissaoPendente += Number(c.amount) || 0;
  }
  let investimento = 0;
  for (const c of (campanhas ?? []) as { budget: number | null; active: boolean }[]) {
    if (c.active) investimento += Number(c.budget) || 0;
  }
  const resultado = comissaoAprovada - investimento;

  const cards: { rotulo: string; valor: string; detalhe?: string }[] = [
    { rotulo: "VISITANTES", valor: String(sessoes.size), detalhe: `${periodo}d (sessões com clique)` },
    { rotulo: "CLIQUES", valor: String(cliques ?? 0), detalhe: `hoje: ${cliquesHoje ?? 0} · views: ${views ?? 0}` },
    { rotulo: "OFERTAS", valor: `${publicadas ?? 0} publicadas`, detalhe: `${aguardando ?? 0} aguardando · ${totalOfertas ?? 0} total` },
    { rotulo: "EXPIRADAS", valor: String(expiradasPeriodo ?? 0), detalhe: `no período ${periodo}d (cron expira sozinho)` },
    { rotulo: "WHATSAPP", valor: `${wa.sent} enviados`, detalhe: `${wa.queued} na fila · ${wa.failed} falharam` },
    { rotulo: "COMISSÃO", valor: brl(comissaoAprovada), detalhe: `pendente: ${brl(comissaoPendente)} (manual)` },
    { rotulo: "INVESTIMENTO", valor: brl(investimento), detalhe: "orçamento campanhas ativas" },
    {
      rotulo: "RESULTADO",
      valor: brl(resultado),
      detalhe: "estimado: aprovadas − investimento",
    },
  ];

  return (
    <>
      <h1>📊 Dashboard V3</h1>
      <p style={{ fontSize: 13 }}>
        Período: <Link href="/admin/v3?periodo=7">7d</Link> · <Link href="/admin/v3?periodo=30">30d</Link>{" "}
        (atual: {periodo}d) · <Link href="/admin/ofertas">Ofertas</Link>
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
        {cards.map((c) => (
          <div key={c.rotulo} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, color: "#68717a" }}>{c.rotulo}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{c.valor}</div>
            {c.detalhe ? <div style={{ fontSize: 11 }}>{c.detalhe}</div> : null}
          </div>
        ))}
      </div>

      <h2>Ofertas mais clicadas</h2>
      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Oferta</th>
              <th>Cliques</th>
            </tr>
          </thead>
          <tbody>
            {topOfertas.map(([id, n]) => (
              <tr key={id}>
                <td>
                  <Link href={`/admin/ofertas/${id}`}>{nomes.get(id) ?? id}</Link>
                </td>
                <td>{n}</td>
              </tr>
            ))}
            {topOfertas.length === 0 && (
              <tr>
                <td colSpan={2}>Sem cliques no período.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>Expiradas recentes</h2>
      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Oferta</th>
              <th>Expirou em</th>
            </tr>
          </thead>
          <tbody>
            {((expiradasRecentes ?? []) as { id: string; slug: string | null; updated_at: string; expires_at: string | null; products: { title: string } | { title: string }[] | null }[]).map((o) => {
              const titulo = Array.isArray(o.products) ? o.products[0]?.title : o.products?.title;
              return (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/ofertas/${o.id}`}>{titulo ?? o.slug ?? o.id}</Link>
                  </td>
                  <td>{o.expires_at ? new Date(o.expires_at).toLocaleString("pt-BR") : "—"}</td>
                </tr>
              );
            })}
            {(expiradasRecentes ?? []).length === 0 && (
              <tr>
                <td colSpan={2}>Nenhuma expirada. O cron expira sozinho às 9h30.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>Cliques por origem</h2>
      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Origem</th>
              <th>Cliques</th>
            </tr>
          </thead>
          <tbody>
            {[...porOrigem.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([origem, n]) => (
                <tr key={origem}>
                  <td>{origem}</td>
                  <td>{n}</td>
                </tr>
              ))}
            {porOrigem.size === 0 && (
              <tr>
                <td colSpan={2}>Sem dados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>Eventos (visualizações)</h2>
      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {[...porEvento.entries()].map(([tipo, n]) => (
              <tr key={tipo}>
                <td>{tipo}</td>
                <td>{n}</td>
              </tr>
            ))}
            {porEvento.size === 0 && (
              <tr>
                <td colSpan={2}>Sem eventos.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
