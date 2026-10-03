import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigirAdmin, ehErroResponse } from "@/lib/v4-guard";
import { TRANSICOES, gerarSlugOferta, type OfferStatus } from "@/lib/v3-types";
import { calcularScoreOferta, resumoPrecos } from "@/lib/v3-score";

// GET /api/v3/offers?id=... → oferta + produto + preços + score (prévia do painel)
// GET /api/v3/offers?status=pending → lista admin (padrão: todas, 50 recentes)
export async function GET(req: Request) {
  try {
    await exigirAdmin();
  } catch (e) {
    if (ehErroResponse(e)) return e;
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  const supabase = await createClient();
  const url = new URL(req.url);
  const id = (url.searchParams.get("id") || "").trim();
  const status = (url.searchParams.get("status") || "").trim();

  if (id) {
    const { data: offer } = await supabase.from("offers").select("*").eq("id", id).single();
    if (!offer) return NextResponse.json({ error: "Oferta não encontrada." }, { status: 404 });
    const [{ data: product }, { data: hist }] = await Promise.all([
      supabase.from("products").select("*").eq("id", offer.product_id).single(),
      supabase
        .from("price_history")
        .select("price, recorded_at")
        .eq("product_id", offer.product_id)
        .order("recorded_at", { ascending: true })
        .limit(500),
    ]);
    const resumo = resumoPrecos(
      (hist ?? []).map((h: { price: number; recorded_at: string }) => ({
        price: Number(h.price),
        recorded_at: h.recorded_at,
      }))
    );
    return NextResponse.json({ ok: true, offer, product, precos: resumo });
  }

  let qry = supabase
    .from("offers")
    .select("*, products(title, image, marketplace)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (status) qry = qry.eq("status", status);
  const { data, error } = await qry;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, offers: data ?? [] });
}

// POST /api/v3/offers — cria rascunho (ou pending com enviar:true).
// Body: { product_id, old_price?, current_price, coupon_code?, coupon_value?,
//         shipping_price?, featured?, published_at?, expires_at?, slug?, enviar? }
export async function POST(req: Request) {
  try {
    await exigirAdmin();
  } catch (e) {
    if (ehErroResponse(e)) return e;
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const product_id = String(body.product_id || "").trim();
  const current_price = Number(body.current_price);
  if (!product_id) return NextResponse.json({ error: "Informe product_id." }, { status: 400 });
  if (!(current_price >= 0)) return NextResponse.json({ error: "Informe current_price válido." }, { status: 400 });

  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("id, title").eq("id", product_id).single();
  if (!product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  const slugBase = String(body.slug || "").trim();
  const { data: offer, error } = await supabase
    .from("offers")
    .insert({
      product_id,
      slug: slugBase || gerarSlugOferta(product.title),
      old_price: body.old_price != null && body.old_price !== "" ? Number(body.old_price) : null,
      current_price,
      coupon_code: (String(body.coupon_code || "").trim() || null) as string | null,
      coupon_value: body.coupon_value != null && body.coupon_value !== "" ? Number(body.coupon_value) : null,
      shipping_price: body.shipping_price != null && body.shipping_price !== "" ? Number(body.shipping_price) : null,
      featured: Boolean(body.featured),
      published_at: (body.published_at as string) || null,
      expires_at: (body.expires_at as string) || null,
      status: body.enviar ? "pending" : "draft",
    })
    .select("*")
    .single();
  if (error || !offer) return NextResponse.json({ error: error?.message ?? "Falha ao criar." }, { status: 500 });

  await recalcularScore(supabase, offer.id);
  const { data: final } = await supabase.from("offers").select("*").eq("id", offer.id).single();
  return NextResponse.json({ ok: true, offer: final ?? offer });
}

// PATCH /api/v3/offers — atualiza campos e/ou status (com transição validada).
// Publicar exige: vir de approved + affiliate_url oficial no produto.
export async function PATCH(req: Request) {
  try {
    await exigirAdmin();
  } catch (e) {
    if (ehErroResponse(e)) return e;
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ error: "Informe id." }, { status: 400 });

  const supabase = await createClient();
  const { data: atual } = await supabase.from("offers").select("*").eq("id", id).single();
  if (!atual) return NextResponse.json({ error: "Oferta não encontrada." }, { status: 404 });

  const patch: Record<string, unknown> = {};
  for (const k of [
    "old_price",
    "current_price",
    "coupon_code",
    "coupon_value",
    "shipping_price",
    "featured",
    "published_at",
    "expires_at",
    "slug",
  ]) {
    if (body[k] !== undefined) patch[k] = body[k] === "" ? null : body[k];
  }

  const novoStatus = body.status as OfferStatus | undefined;
  if (novoStatus && novoStatus !== atual.status) {
    const permitidos = TRANSICOES[atual.status as OfferStatus] ?? [];
    if (!permitidos.includes(novoStatus)) {
      return NextResponse.json(
        { error: `Transição inválida: ${atual.status} → ${novoStatus}.` },
        { status: 422 }
      );
    }
    if (novoStatus === "published") {
      const { data: prod } = await supabase
        .from("products")
        .select("affiliate_url")
        .eq("id", atual.product_id)
        .single();
      if (!prod?.affiliate_url) {
        return NextResponse.json(
          { error: "Só publique com link de afiliado oficial no produto (regras do programa)." },
          { status: 422 }
        );
      }
      if (!atual.published_at && !patch.published_at) patch.published_at = new Date().toISOString();
    }
    // Reativar expirada em 1 clique: expired → draft limpa o vencimento passado,
    // salvo se o admin já informou outro expires_at no mesmo PATCH.
    if (atual.status === "expired" && novoStatus === "draft" && patch.expires_at === undefined) {
      patch.expires_at = null;
    }
    patch.status = novoStatus;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from("offers").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recalcularScore(supabase, id);
  const { data: final } = await supabase.from("offers").select("*").eq("id", id).single();
  return NextResponse.json({ ok: true, offer: final });
}

// DELETE /api/v3/offers?id=... — exclui (rascunhos e rejeitadas; publicadas: expire antes).
export async function DELETE(req: Request) {
  try {
    await exigirAdmin();
  } catch (e) {
    if (ehErroResponse(e)) return e;
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  const id = (new URL(req.url).searchParams.get("id") || "").trim();
  if (!id) return NextResponse.json({ error: "Informe id." }, { status: 400 });
  const supabase = await createClient();
  const { data: atual } = await supabase.from("offers").select("status").eq("id", id).single();
  if (!atual) return NextResponse.json({ error: "Oferta não encontrada." }, { status: 404 });
  if (atual.status === "published") {
    return NextResponse.json({ error: "Expire ou pause antes de excluir uma oferta publicada." }, { status: 422 });
  }
  const { error } = await supabase.from("offers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Recalcula score/score_level com dados reais (produto + histórico + oferta).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recalcularScore(supabase: any, offerId: string) {
  try {
    const { data: offer } = await supabase.from("offers").select("*").eq("id", offerId).single();
    if (!offer) return;
    const [{ data: product }, { data: hist }] = await Promise.all([
      supabase
        .from("products")
        .select("price, old_price, discount, rating, reviews, sold, commission_rate")
        .eq("id", offer.product_id)
        .single(),
      supabase
        .from("price_history")
        .select("price, recorded_at")
        .eq("product_id", offer.product_id)
        .order("recorded_at", { ascending: true })
        .limit(500),
    ]);
    const resumo = resumoPrecos(
      (hist ?? []).map((h: { price: number; recorded_at: string }) => ({
        price: Number(h.price),
        recorded_at: h.recorded_at,
      }))
    );
    const oldPrice = offer.old_price != null ? Number(offer.old_price) : null;
    const curPrice = Number(offer.current_price);
    const desconto =
      oldPrice != null && oldPrice > 0 && oldPrice > curPrice
        ? Math.round(((oldPrice - curPrice) / oldPrice) * 100)
        : Number(product?.discount) || 0;
    const r = calcularScoreOferta({
      desconto,
      precoAtual: curPrice,
      precoMinimo: resumo.minimo,
      registrosHistorico: resumo.registros,
      rating: product ? Number(product.rating) : null,
      reviews: product ? Number(product.reviews) : null,
      sold: product ? Number(product.sold) : null,
      commissionRate: product ? Number(product.commission_rate) : null,
      temCupom: Boolean(offer.coupon_code),
      freteGratis: offer.shipping_price != null && Number(offer.shipping_price) === 0,
    });
    await supabase.from("offers").update({ score: r.score, score_level: r.nivel }).eq("id", offerId);
  } catch {
    // Score é métrica auxiliar: nunca quebra o salvamento da oferta.
  }
}
