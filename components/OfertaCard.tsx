import Link from "next/link";
import { ROTULO_NIVEL } from "@/lib/v3-types";

function brl(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Card público da oferta V3 (item 9 da spec). Só exibe; a saída acontece
// na página /oferta/[slug] pelo botão consciente IR PARA A OFERTA.
export default function OfertaCard({
  offer,
}: {
  offer: {
    slug: string | null;
    current_price: number;
    old_price: number | null;
    discount_percentage: number;
    coupon_code: string | null;
    score: number;
    score_level: "EXCELENTE" | "BOA" | "NORMAL" | "NAO_RECOMENDADA";
    title: string;
    image: string;
    rating: number | null;
    reviews: number | null;
  };
}) {
  if (!offer.slug) return null;
  const temAntigo = offer.old_price != null && Number(offer.old_price) > Number(offer.current_price);
  return (
    <div className="product">
      <Link href={`/oferta/${offer.slug}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={offer.image} alt={offer.title} loading="lazy" />
      </Link>
      <h3>
        <Link href={`/oferta/${offer.slug}`}>{offer.title}</Link>
      </h3>
      <p>
        {temAntigo && <s>{brl(offer.old_price)}</s>} <strong>{brl(offer.current_price)}</strong>{" "}
        {offer.discount_percentage > 0 && <span>🏷️ {offer.discount_percentage}% OFF</span>}
      </p>
      {offer.coupon_code && (
        <p>
          🎟️ Cupom: <strong>{offer.coupon_code}</strong>
        </p>
      )}
      {Number(offer.reviews) > 0 && (
        <p>
          ⭐ {offer.rating} ({Number(offer.reviews).toLocaleString("pt-BR")})
        </p>
      )}
      <p style={{ fontSize: 12 }}>
        📊 {offer.score}/100 — {ROTULO_NIVEL[offer.score_level]}
      </p>
      <Link href={`/oferta/${offer.slug}`} className="cta">
        VER OFERTA
      </Link>
    </div>
  );
}
