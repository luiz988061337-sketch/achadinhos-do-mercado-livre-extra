import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigirAdmin, ehErroResponse } from "@/lib/v4-guard";
import { validarCandidato, type CandidatoOferta } from "@/lib/v3-cacador";
import { calcularScoreOferta } from "@/lib/v3-score";

// POST /api/v3/cacador/intake — entrada autorizada de oportunidade.
// Auth: sessão admin OU `Authorization: Bearer CRON_SECRET` (futuras
// integrações oficiais). Cria product `pending` (aprovação em /admin/v4/pendentes).
// NUNCA faz scraping: só recebe dados enviados pela integração autorizada.
export async function POST(req: Request) {
  let adminId = "";
  try {
    const a = await exigirAdmin();
    adminId = a.userId;
  } catch (e) {
    if (ehErroResponse(e)) {
      const secreto = process.env.CRON_SECRET || "";
      const auth = req.headers.get("authorization") || "";
      if (!secreto || auth !== `Bearer ${secreto}`) return e;
    } else {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
  }

  let body: CandidatoOferta;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const v = validarCandidato(body);
  if (!v.ok) return NextResponse.json({ error: v.motivo }, { status: 422 });

  const marketplace = body.marketplace ?? "mercadolivre";
  const supabase = adminId ? await createClient() : await createAdminClient();

  // Deduplicação: mesmo external_id ou mesma URL.
  if (body.external_id) {
    const { data: dup } = await supabase
      .from("products")
      .select("id, status")
      .eq("marketplace", marketplace)
      .eq("external_id", body.external_id)
      .maybeSingle();
    if (dup) {
      return NextResponse.json({ ok: true, duplicado: true, product_id: dup.id, status: dup.status });
    }
  }
  {
    const { data: dup } = await supabase
      .from("products")
      .select("id, status")
      .eq("url", body.url)
      .maybeSingle();
    if (dup) {
      return NextResponse.json({ ok: true, duplicado: true, product_id: dup.id, status: dup.status });
    }
  }

  const oldPrice = body.old_price != null && String(body.old_price) !== "" ? Number(body.old_price) : null;
  const price = Number(body.price);
  const desconto =
    oldPrice != null && oldPrice > 0 && oldPrice > price
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : 0;

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      title: body.title.trim(),
      image: body.image,
      price,
      old_price: oldPrice,
      discount: desconto || null,
      rating: body.rating != null ? Number(body.rating) : 0,
      reviews: body.reviews != null ? Number(body.reviews) : 0,
      sold: body.sold != null ? Number(body.sold) : 0,
      url: body.url,
      affiliate_url: body.affiliate_url?.trim() || null,
      marketplace,
      commission: body.commission != null ? Number(body.commission) : null,
      commission_rate: body.commission_rate != null ? Number(body.commission_rate) : null,
      status: "pending",
      external_id: body.external_id || null,
      category: body.category || null,
    })
    .select("id")
    .single();
  if (error || !product) {
    return NextResponse.json({ error: error?.message ?? "Falha ao registrar." }, { status: 500 });
  }

  // Score inicial (histórico ainda insuficiente: 1 registro do trigger).
  const r = calcularScoreOferta({
    desconto,
    precoAtual: price,
    precoMinimo: null,
    registrosHistorico: 1,
    rating: body.rating != null ? Number(body.rating) : null,
    reviews: body.reviews != null ? Number(body.reviews) : null,
    sold: body.sold != null ? Number(body.sold) : null,
    commissionRate: body.commission_rate != null ? Number(body.commission_rate) : null,
    temCupom: false,
    freteGratis: false,
  });
  await supabase.from("products").update({ score: r.score }).eq("id", product.id);

  return NextResponse.json({
    ok: true,
    nova_oportunidade: {
      product_id: product.id,
      titulo: body.title.trim(),
      preco: price,
      preco_anterior_registrado: oldPrice,
      desconto,
      score: r.score,
      nivel: r.nivel,
      aprovar_em: "/admin/v4/pendentes",
    },
  });
}
