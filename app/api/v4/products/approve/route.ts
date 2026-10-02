import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigirAdmin, ehErroResponse } from "@/lib/v4-guard";
import { montarMensagemOferta } from "@/lib/whatsapp";

// POST /api/v4/products/approve { id, action: "approve"|"reject"|"queue", affiliate_url? }
// - approve: exige affiliate_url oficial (do body ou já salvo) → status approved.
// - reject: status rejected.
// - queue: mantém/aprova + cria item em whatsapp_queue + log.
export async function POST(req: Request) {
  try {
    await exigirAdmin();
  } catch (e) {
    if (ehErroResponse(e)) return e;
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  let body: { id?: string; action?: string; affiliate_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const id = (body.id || "").trim();
  const action = (body.action || "").trim();
  if (!id || !["approve", "reject", "queue"].includes(action)) {
    return NextResponse.json({ error: "Informe id + action (approve|reject|queue)." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: p, error: errGet } = await supabase.from("products").select("*").eq("id", id).single();
  if (errGet || !p) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  if (action === "reject") {
    const { error } = await supabase.from("products").update({ status: "rejected" }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  if (action === "approve") {
    const aff = (body.affiliate_url || p.affiliate_url || "").trim();
    if (!aff.startsWith("https://")) {
      return NextResponse.json({ error: "Para publicar, cole o affiliate_url OFICIAL (https://...)." }, { status: 422 });
    }
    const { error } = await supabase.from("products").update({ status: "approved", affiliate_url: aff }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: "approved" });
  }

  // queue: exige affiliate (aprovado ou aprovando agora) + cria fila + log
  const aff = (body.affiliate_url || p.affiliate_url || "").trim();
  if (!aff.startsWith("https://")) {
    return NextResponse.json({ error: "Para entrar na fila do WhatsApp, o produto precisa do affiliate_url oficial." }, { status: 422 });
  }
  if (p.status !== "approved") {
    const { error } = await supabase.from("products").update({ status: "approved", affiliate_url: aff }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const message = montarMensagemOferta({ title: p.title, price: Number(p.price), old_price: p.old_price != null ? Number(p.old_price) : null, discount: p.discount, affiliate_url: aff, url: p.url });
  const { data: fila, error: errFila } = await supabase
    .from("whatsapp_queue")
    .insert({ product_id: id, status: "queued", message })
    .select("id")
    .single();
  if (errFila) return NextResponse.json({ error: errFila.message }, { status: 500 });
  await supabase.from("whatsapp_logs").insert({ queue_id: fila.id, product_id: id, action: "queued", result: "Adicionado à fila pelo painel." });
  return NextResponse.json({ ok: true, status: "approved", queued: fila.id });
}
