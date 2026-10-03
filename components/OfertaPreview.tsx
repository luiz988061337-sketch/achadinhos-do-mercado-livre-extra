import type { Offer } from "@/lib/v3-types";
import { ROTULO_NIVEL } from "@/lib/v3-types";

function brl(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Prévia fiel ao card público (item 9 da spec): imagem, nome, preços,
// desconto, cupom, avaliação, score interno e botão VER OFERTA.
// Não redireciona sozinha: é só visualização antes de publicar.
export default function OfertaPreview({
  offer,
  product,
}: {
  offer: Pick<
    Offer,
    "old_price" | "current_price" | "discount_percentage" | "coupon_code" | "score" | "score_level"
  >;
  product: { title: string; image: string; rating?: number | null; reviews?: number | null };
}) {
  const temAntigo = offer.old_price != null && Number(offer.old_price) > Number(offer.current_price);
  return (
    <div className="previewCard" style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, maxWidth: 360 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.image}
        alt={product.title}
        style={{ width: "100%", borderRadius: 8, objectFit: "cover" }}
        loading="lazy"
      />
      <h3 style={{ margin: "12px 0 4px" }}>{product.title}</h3>
      <p style={{ margin: 0 }}>
        {temAntigo && <s style={{ color: "#68717a" }}>{brl(offer.old_price)}</s>}{" "}
        <strong style={{ fontSize: 20 }}>{brl(offer.current_price)}</strong>{" "}
        {offer.discount_percentage > 0 && <span>🏷️ {offer.discount_percentage}% OFF</span>}
      </p>
      {offer.coupon_code && <p style={{ margin: "4px 0" }}>🎟️ Cupom: <strong>{offer.coupon_code}</strong></p>}
      {Number(product.reviews) > 0 && (
        <p style={{ margin: "4px 0" }}>⭐ {product.rating} ({Number(product.reviews).toLocaleString("pt-BR")} avaliações)</p>
      )}
      <p style={{ margin: "4px 0" }}>
        📊 Score interno: <strong>{offer.score}/100</strong> — {ROTULO_NIVEL[offer.score_level]}
      </p>
      <button type="button" className="secondary" disabled style={{ marginTop: 8 }}>
        VER OFERTA (prévia)
      </button>
      <p style={{ fontSize: 11, color: "#68717a" }}>Os preços e condições podem mudar no Mercado Livre.</p>
    </div>
  );
}
