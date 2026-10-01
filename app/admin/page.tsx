import { createClient } from "@/lib/supabase/server";

export default async function Admin() {
  const supabase = await createClient();
  const [{ count: produtos }, { count: cliques }, { data: top }] = await Promise.all([
    supabase.from("produtos").select("*", { count: "exact", head: true }),
    supabase.from("cliques").select("*", { count: "exact", head: true }),
    supabase.from("produto_cliques").select("*").limit(10)
  ]);

  return <><h1>📊 Dashboard</h1><p>Visão geral do seu site de afiliados.</p><div className="adminGrid"><div className="stat">Produtos<strong>{produtos ?? 0}</strong></div><div className="stat">Cliques<strong>{cliques ?? 0}</strong></div><div className="stat">Produtos ativos<strong>Consulte Produtos</strong></div><div className="stat">Comissões<strong>Mercado Livre</strong></div></div><div className="notice">O contador de cliques registra cada acesso ao botão “Ver oferta”. Comissões dependem da validação do programa de afiliados.</div><h2>Produtos com cliques</h2><div className="tableWrap"><table className="table"><thead><tr><th>Produto</th><th>Cliques</th></tr></thead><tbody>{(top ?? []).map((p:any)=><tr key={p.id}><td>{p.nome}</td><td>{p.cliques}</td></tr>)}</tbody></table></div></>;
}