import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigirAdmin, ehErroResponse } from "@/lib/v4-guard";
import { montarMensagemOferta } from "@/lib/whatsapp";

// POST /api/v4/whatsapp/queue { product_id, message? }
// Coloca oferta aprovada na fila. Sem automação não oficial.
export async function POST(req: Request) {
  try {
    await exigirAdmin();
  } catch (e) {
    if (ehErroResponse(e)) return e;
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  let body: { product_id?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const product_id = (body.product_id || "").trim();
  if (!product_id) return NextResponse.json({ error: "Informe product_id." }, { status: 400 });

  const supabase = await createClient();
  const { data: p } = await supabase.from("products").select("*").eq("id", product_id).single();
  if (!p) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  if (p.status !== "approved") return NextResponse.json({ error: "Só produtos aprovados entram na fila." }, { status: 422 });

  const message =
    (body.message || "").trim() ||
    montarMensagemOferta({ title: p.title, price: Number(p.price), old_price: p.old_price != null ? Number(p.old_price) : null, discount: p.discount, affiliate_url: p.affiliate_url, url: p.url });

  const { data: fila, error } = await supabase
    .from("whatsapp_queue")
    .insert({ product_id, status: "queued", message })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("whatsapp_logs").insert({ queue_id: fila.id, product_id, action: "queued", result: "Adicionado à fila pelo painel." });
  return NextResponse.json({ ok: true, queued: fila.id });
}
