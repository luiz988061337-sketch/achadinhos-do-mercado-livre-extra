import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigirAdmin, ehErroResponse } from "@/lib/v4-guard";
import { gerarPublicacaoLocal, auditarPublicacao, type DadosReais } from "@/lib/v3-ia";

// POST /api/v3/ia/gerar { offer_id, salvar? }
// Gera Título + Descrição + WhatsApp + Instagram + TikTok usando SOMENTE
// dados reais da oferta/produto. `salvar:true` grava rascunhos em social_posts.
export async function POST(req: Request) {
  try {
    await exigirAdmin();
  } catch (e) {
    if (ehErroResponse(e)) return e;
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  let body: { offer_id?: string; salvar?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const offer_id = (body.offer_id || "").trim();
  if (!offer_id) return NextResponse.json({ error: "Informe offer_id." }, { status: 400 });

  const supabase = await createClient();
  const { data: offer } = await supabase.from("offers").select("*").eq("id", offer_id).single();
  if (!offer) return NextResponse.json({ error: "Oferta não encontrada." }, { status: 404 });
  const { data: product } = await supabase
    .from("products")
    .select("title, price, rating, reviews, category")
    .eq("id", offer.product_id)
    .single();
  if (!product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  const dados: DadosReais = {
    titulo: product.title,
    preco: Number(offer.current_price),
    precoAntigo: offer.old_price != null ? Number(offer.old_price) : null,
    desconto: Number(offer.discount_percentage) || 0,
    cupom: offer.coupon_code,
    freteGratis:
      offer.shipping_price != null ? Number(offer.shipping_price) === 0 : null,
    rating: product.rating != null ? Number(product.rating) : null,
    reviews: product.reviews != null ? Number(product.reviews) : null,
    categoria: product.category,
  };
  const textos = gerarPublicacaoLocal(dados);
  const alertas = auditarPublicacao(dados, textos);

  let salvos = 0;
  if (body.salvar) {
    const canais: { channel: string; legenda: string }[] = [
      { channel: "whatsapp", legenda: textos.whatsapp },
      { channel: "instagram", legenda: textos.instagram },
      { channel: "tiktok", legenda: textos.tiktok },
    ];
    for (const c of canais) {
      const { error } = await supabase.from("social_posts").insert({
        offer_id,
        channel: c.channel,
        legenda: c.legenda,
        status: "draft",
      });
      if (!error) salvos += 1;
    }
  }
  return NextResponse.json({ ok: true, textos, alertas, salvos });
}
