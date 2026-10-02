import { createClient } from "@/lib/supabase/server";
import BotaoEnviarWA from "@/components/BotaoEnviarWA";

// Fila WhatsApp V4 — curadoria humana, envio só via API oficial.
// Sem automação não oficial (risco de bloqueio).
export default async function WhatsappPage() {
  const supabase = await createClient();
  const [{ data: fila }, { data: logs }] = await Promise.all([
    supabase.from("whatsapp_queue").select("id,status,message,created_at,product_id,products(title)").order("created_at", { ascending: false }).limit(50),
    supabase.from("whatsapp_logs").select("id,action,result,error,created_at,product_id").order("created_at", { ascending: false }).limit(50),
  ]);
  const filaLista = (fila ?? []) as unknown as { id: string; status: string; message: string | null; product_id: string; products: { title: string } | { title: string }[] | null }[];
  const logsLista = (logs ?? []) as unknown as { id: number; action: string; result: string | null; error: string | null; created_at: string }[];

  return <>
    <h1>💬 Fila WhatsApp (V4)</h1>
    <p>Envio somente pela <strong>API oficial</strong> (WhatsApp Business/Cloud). Sem ela, o item fica na fila com log.</p>
    <div className="notice">Configure no servidor: WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_ID (+ opcional WHATSAPP_TEST_TO).</div>

    <h2>📥 Na fila / histórico</h2>
    <div className="tableWrap"><table className="table">
      <thead><tr><th>Produto</th><th>Status</th><th>Mensagem</th><th>Ação</th></tr></thead>
      <tbody>
        {filaLista.map((q) => {
          const titulo = Array.isArray(q.products) ? q.products[0]?.title : q.products?.title;
          return <tr key={q.id}>
            <td>{titulo ?? q.product_id}</td>
            <td>{q.status}</td>
            <td style={{ maxWidth: 320, fontSize: 12 }}>{(q.message || "").slice(0, 160)}</td>
            <td>{q.status === "queued" || q.status === "failed" ? <BotaoEnviarWA queueId={q.id} /> : <span style={{ fontSize: 12 }}>—</span>}</td>
          </tr>;
        })}
        {filaLista.length === 0 && <tr><td colSpan={4}>Fila vazia. Aprove um produto com “Fila WA”.</td></tr>}
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
