import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigirAdmin, ehErroResponse } from "@/lib/v4-guard";

// POST /api/v4/whatsapp/send { queue_id, to? }
// Envio SOMENTE via API oficial (WhatsApp Business Cloud API).
// - Sem WHATSAPP_ACCESS_TOKEN/PHONE_ID: mantém "queued" + log explicativo.
// - Com credenciais + `to`: chama graph.facebook.com; atualiza sent/failed + log.
// Nunca usa automação não oficial.
export async function POST(req: Request) {
  try {
    await exigirAdmin();
  } catch (e) {
    if (ehErroResponse(e)) return e;
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  let body: { queue_id?: string; to?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const queue_id = (body.queue_id || "").trim();
  if (!queue_id) return NextResponse.json({ error: "Informe queue_id." }, { status: 400 });

  const supabase = await createClient();
  const { data: item } = await supabase.from("whatsapp_queue").select("*").eq("id", queue_id).single();
  if (!item) return NextResponse.json({ error: "Item da fila não encontrado." }, { status: 404 });
  if (item.status === "sent") return NextResponse.json({ ok: true, status: "sent", detalhe: "Já enviado." });

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    await supabase.from("whatsapp_logs").insert({
      queue_id, product_id: item.product_id, action: "send_skipped",
      result: "API oficial não configurada (WHATSAPP_ACCESS_TOKEN/PHONE_ID). Item mantido na fila.",
    });
    return NextResponse.json({ ok: false, status: "queued", aviso: "WhatsApp Business não configurado. Configure WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_ID." }, { status: 428 });
  }

  const to = (body.to || process.env.WHATSAPP_TEST_TO || "").trim();
  if (!to) return NextResponse.json({ error: "Informe `to` (número E.164) ou configure WHATSAPP_TEST_TO." }, { status: 400 });

  try {
    const { enviarViaAPIOficial } = await import("@/lib/whatsapp");
    const r = await enviarViaAPIOficial(to, item.message || "");
    await supabase.from("whatsapp_queue").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", queue_id);
    await supabase.from("whatsapp_logs").insert({ queue_id, product_id: item.product_id, action: "sent", result: `messageId=${r.messageId} to=${to}` });
    return NextResponse.json({ ok: true, status: "sent", messageId: r.messageId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha no envio.";
    await supabase.from("whatsapp_queue").update({ status: "failed" }).eq("id", queue_id);
    await supabase.from("whatsapp_logs").insert({ queue_id, product_id: item.product_id, action: "failed", error: msg });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
