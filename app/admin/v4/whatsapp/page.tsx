import { createClient } from "@/lib/supabase/server";
import BotaoEnviarWA from "@/components/BotaoEnviarWA";
import BotaoCancelarWA from "@/components/BotaoCancelarWA";
import BotaoManualWA from "@/components/BotaoManualWA";
import { whatsappConfigurado } from "@/lib/whatsapp";

// Fila WhatsApp V4 — curadoria humana, envio só via API oficial.
// Sem automação não oficial (risco de bloqueio).
// O cron de preços (9h30) adiciona quedas de aprovados sozinho na fila
// (log price_drop_queued) — o envio continua manual aqui no painel.
export default async function WhatsappPage() {
  const supabase = await createClient();
  const [{ data: fila }, { data: logs }] = await Promise.all([
    supabase.from("whatsapp_queue").select("id,status,message,created_at,sent_at,product_id,products(title)").order("created_at", { ascending: false }).limit(50),
    supabase.from("whatsapp_logs").select("id,action,result,error,created_at,product_id").order("created_at", { ascending: false }).limit(50),
  ]);
  const filaLista = (fila ?? []) as unknown as { id: string; status: string; message: string | null; created_at: string; sent_at: string | null; product_id: string; products: { title: string } | { title: string }[] | null }[];
  const logsLista = (logs ?? []) as unknown as { id: number; action: string; result: string | null; error: string | null; created_at: string }[];
  const pendentes = filaLista.filter((q) => q.status === "queued" || q.status === "failed").length;
  const manual = !whatsappConfigurado();

  return <>
    <h1>💬 Fila WhatsApp (V4)</h1>
    <p>Envio somente pela <strong>API oficial</strong> (WhatsApp Business/Cloud). Sem ela, o item fica na fila com log.</p>
    {manual ? (
      <div className="notice" role="status">📋 <strong>MODO MANUAL ATIVO</strong> — Cloud API não conectada. Copie a mensagem de cada item e cole no grupo/número (botões 📋 Copiar / wa.me). Os links do site com <em>?origem=ACHADINHOS_WHATSAPP</em> continuam medindo cliques. Envio automático 1:1 desabilitado.</div>
    ) : null}
    <div className="notice">Configure no servidor: WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_ID (+ opcional WHATSAPP_TEST_TO para testes). Quedas de preço de aprovados entram sozinhas via cron 9h30 (log <em>price_drop_queued</em>). {pendentes > 0 ? <><strong>{pendentes} aguardando envio.</strong></> : "Nada pendente 🎉"}</div>

    <h2>📥 Na fila / histórico</h2>
    <div className="tableWrap"><table className="table">
      <thead><tr><th>Produto</th><th>Status</th><th>Criado / Enviado</th><th>Mensagem</th><th>Ação</th></tr></thead>
      <tbody>
        {filaLista.map((q) => {
          const titulo = Array.isArray(q.products) ? q.products[0]?.title : q.products?.title;
          return <tr key={q.id}>
            <td>{titulo ?? q.product_id}</td>
            <td>{q.status}</td>
            <td style={{ fontSize: 12 }}>{new Date(q.created_at).toLocaleString("pt-BR")}{q.sent_at ? <><br />📤 {new Date(q.sent_at).toLocaleString("pt-BR")}</> : null}</td>
            <td style={{ maxWidth: 320, fontSize: 12 }}>{(q.message || "").slice(0, 160)}</td>
            <td>{q.status === "queued" || q.status === "failed"
              ? <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><BotaoManualWA message={q.message || ""} /><BotaoEnviarWA queueId={q.id} /><BotaoCancelarWA queueId={q.id} /></span>
              : <span style={{ fontSize: 12 }}>—</span>}</td>
          </tr>;
        })}
        {filaLista.length === 0 && <tr><td colSpan={5}>Fila vazia. Aprove um produto com “Fila WA” ou aguarde o cron de quedas de preço.</td></tr>}
      </tbody></table></div>

    <h2>🧾 Logs</h2>
    <div className="tableWrap"><table className="table">
      <thead><tr><th>Quando</th><th>Ação</th><th>Detalhe</th></tr></thead>
      <tbody>
        {logsLista.map((l) =>
          <tr key={l.id}><td>{new Date(l.created_at).toLocaleString("pt-BR")}</td><td>{l.action}</td><td style={{ fontSize: 12 }}>{l.result || l.error || "—"}</td></tr>)}
        {logsLista.length === 0 && <tr><td colSpan={3}>Sem logs.</td></tr>}
      </tbody></table></div>
  </>;
}
