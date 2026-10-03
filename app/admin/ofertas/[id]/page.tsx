import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OfertaForm from "@/components/OfertaForm";
import OfertasActions from "@/components/OfertasActions";
import OfertaPreview from "@/components/OfertaPreview";
import BlocoPrecos from "@/components/BlocoPrecos";
import BotaoGerarPublicacao from "@/components/BotaoGerarPublicacao";
import { resumoPrecos } from "@/lib/v3-score";
import { ROTULO_NIVEL, STATUS_OFERTA, type Offer } from "@/lib/v3-types";

// Detalhe da oferta: edição + prévia fiel + score + histórico + ações.
export default async function OfertaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: offer } = await supabase.from("offers").select("*").eq("id", id).single();
  if (!offer) notFound();
  const o = offer as unknown as Offer;

  const [{ data: product }, { data: hist }] = await Promise.all([
    supabase.from("products").select("*").eq("id", o.product_id).single(),
    supabase
      .from("price_history")
      .select("price, recorded_at")
      .eq("product_id", o.product_id)
      .order("recorded_at", { ascending: true })
      .limit(500),
  ]);
  const precos = resumoPrecos(
    (hist ?? []).map((h: { price: number; recorded_at: string }) => ({
      price: Number(h.price),
      recorded_at: h.recorded_at,
    }))
  );

  return (
    <>
      <h1>🏷️ Oferta — {STATUS_OFERTA.find((s) => s.id === o.status)?.rotulo ?? o.status}</h1>
      <p style={{ fontSize: 13 }}>
        Score: <strong>{o.score}/100</strong> — {ROTULO_NIVEL[o.score_level]} (métrica interna, não é
        garantia de menor preço)
      </p>

      <h2>Prévia (como vai aparecer no site)</h2>
      {product ? (
        <OfertaPreview
          offer={{
            old_price: o.old_price != null ? Number(o.old_price) : null,
            current_price: Number(o.current_price),
            discount_percentage: o.discount_percentage,
            coupon_code: o.coupon_code,
            score: o.score,
            score_level: o.score_level,
          }}
          product={{
            title: product.title,
            image: product.image,
            rating: product.rating != null ? Number(product.rating) : null,
            reviews: product.reviews != null ? Number(product.reviews) : null,
          }}
        />
      ) : (
        <div className="notice">Produto não encontrado.</div>
      )}

      <h2>Editar</h2>
      <OfertaForm offer={o} />

      <h2>Ciclo de vida</h2>
      <OfertasActions id={o.id} statusAtual={o.status} />

      <h2>Conteúdo IA</h2>
      <BotaoGerarPublicacao offerId={o.id} />

      <h2>Histórico de preços</h2>
      <BlocoPrecos precos={precos} />
    </>
  );
}
