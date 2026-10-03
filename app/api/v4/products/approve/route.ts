import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigirAdmin, ehErroResponse } from "@/lib/v4-guard";
import { montarMensagemOferta } from "@/lib/whatsapp";
import { calcularScore, descontoEfetivo } from "@/lib/score";
import { gerarSlugOferta } from "@/lib/v3-types";

// POST /api/v4/products/approve { id, action: "approve"|"reject"|"queue", affiliate_url?, price?, url? }
// - approve: exige preço>0, url https e affiliate_url oficial → approved (score recalculado).
// - reject: status rejected.
// - queue: aprova (com os mesmos dados) + cria item em whatsapp_queue + log.
export async function POST(req: Request) {
  try {
    await exigirAdmin();
  } catch (e) {
    if (ehErroResponse(e)) return e;
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  let body: { id?: string; action?: string; affiliate_url?: string; price?: number; url?: string };
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

  // Dados finais da curadoria (catálogo pode ter vindo sem preço/url).
  function curadoria() {
    const aff = (body.affiliate_url || p.affiliate_url || "").trim();
    const link = (body.url || p.url || "").trim();
    const preco = body.price != null ? Number(body.price) : Number(p.price);
    if (!(preco > 0)) return { erro: "Informe o preço atual da oferta." };
    if (!link.startsWith("https://")) return { erro: "Informe o link (URL) da oferta no marketplace." };
    if (!aff.startsWith("https://")) return { erro: "Cole o affiliate_url OFICIAL (https://...)." };
    const old = p.old_price != null && Number(p.old_price) > preco ? Number(p.old_price) : null;
    const desc = descontoEfetivo({ price: preco, old_price: old, discount: p.discount });
    const { score } = calcularScore({ price: preco, old_price: old, discount: desc, rating: Number(p.rating) || 0, reviews: Number(p.reviews) || 0, sold: Number(p.sold) || 0, commission: p.commission != null ? Number(p.commission) : null, commission_rate: p.commission_rate != null ? Number(p.commission_rate) : null });
    return { aff, link, preco, old, desc, score };
  }

  if (action === "approve") {
    const c = curadoria();
    if ("erro" in c) return NextResponse.json({ error: c.erro }, { status: 422 });
    const { error } = await supabase.from("products").update({ status: "approved", affiliate_url: c.aff, url: c.link, price: c.preco, old_price: c.old, discount: c.desc, score: c.score }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const oferta = await garantirOfertaDraft(supabase, id, p.title, c.preco, c.old);
    return NextResponse.json({ ok: true, status: "approved", offer_id: oferta?.id ?? null, offer_slug: oferta?.slug ?? null });
  }

  // queue: exige affiliate (aprovado ou aprovando agora) + cria fila + log
  const c = curadoria();
  if ("erro" in c) return NextResponse.json({ error: c.erro }, { status: 422 });
  if (p.status !== "approved") {
    const { error } = await supabase.from("products").update({ status: "approved", affiliate_url: c.aff, url: c.link, price: c.preco, old_price: c.old, discount: c.desc, score: c.score }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const message = montarMensagemOferta({ title: p.title, price: c.preco, old_price: c.old, discount: c.desc, affiliate_url: c.aff, url: c.link });
  const { data: fila, error: errFila } = await supabase
    .from("whatsapp_queue")
    .insert({ product_id: id, status: "queued", message })
    .select("id")
    .single();
  if (errFila) return NextResponse.json({ error: errFila.message }, { status: 500 });
  await supabase.from("whatsapp_logs").insert({ queue_id: fila.id, product_id: id, action: "queued", result: "Adicionado à fila pelo painel." });
  const oferta = await garantirOfertaDraft(supabase, id, p.title, c.preco, c.old);
  return NextResponse.json({ ok: true, status: "approved", queued: fila.id, offer_id: oferta?.id ?? null, offer_slug: oferta?.slug ?? null });
}

// Garante 1 oferta V3 em draft para o produto aprovado (evita "página não existe").
// Se já existe oferta (qualquer status), reaproveita a mais recente. Nunca quebra a aprovação.
async function garantirOfertaDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  product_id: string,
  title: string,
  current_price: number,
  old_price: number | null
): Promise<{ id: string; slug: string | null } | null> {
  try {
    const { data: existente } = await supabase
      .from("offers")
      .select("id, slug")
      .eq("product_id", product_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existente?.id) return existente;
    const { data: criada, error } = await supabase
      .from("offers")
      .insert({
        product_id,
        slug: gerarSlugOferta(title || "oferta"),
        old_price: old_price,
        current_price,
        status: "draft",
      })
      .select("id, slug")
      .single();
    if (error || !criada) return null;
    return criada;
  } catch {
    return null;
  }
}
