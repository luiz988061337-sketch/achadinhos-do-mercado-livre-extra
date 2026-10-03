import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigirAdmin, ehErroResponse } from "@/lib/v4-guard";

// POST /api/v4/whatsapp/cancel { queue_id }
// Cancela item queued/failed (vai para cancelled + log). Sem automação.
export async function POST(req: Request) {
  try {
    await exigirAdmin();
  } catch (e) {
    if (ehErroResponse(e)) return e;
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  let body: { queue_id?: string };
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
  if (item.status === "sent") return NextResponse.json({ error: "Item já enviado — não pode cancelar." }, { status: 422 });
  if (item.status === "cancelled") return NextResponse.json({ ok: true, status: "cancelled" });

  const { error } = await supabase.from("whatsapp_queue").update({ status: "cancelled" }).eq("id", queue_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("whatsapp_logs").insert({
    queue_id,
    product_id: item.product_id,
    action: "cancelled",
    result: "Cancelado manualmente no painel.",
  });
  return NextResponse.json({ ok: true, status: "cancelled" });
}
