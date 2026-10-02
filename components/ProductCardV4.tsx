import Link from "next/link";
import type { V4Product } from "@/lib/v4-types";
import { brl } from "@/components/ProductCard";

function comOrigem(href: string, origem?: string) {
  if (!origem) return href;
  return `${href}?origem=${encodeURIComponent(origem)}`;
}

// Card V4: marketplaces ML/Shopee, score visível, CTA vai para /ver/[id] (rastreado).
export default function ProductCardV4({ produto, origem }: { produto: V4Product; origem?: string }) {
  const preco = Number(produto.price);
  const antigo = produto.old_price !== null ? Number(produto.old_price) : null;
  const economia = antigo !== null && antigo > preco ? antigo - preco : 0;
  const ver = comOrigem(`/ver/${produto.id}`, origem);
  const loja = produto.marketplace === "shopee" ? "Shopee" : "Mercado Livre";

  return <article className="card">
    <div className="cardImage" aria-hidden="true">
      <img src={produto.image} alt={produto.title} loading="lazy" />
    </div>
    <div className="cardBody">
      <div>
        <span className="badgeHot">🏪 {loja}</span>
        {produto.discount ? <span className="badgeOff">{produto.discount}% OFF</span> : null}
        <span className="badgeHot" title="Score 0-100 (desconto, avaliação, vendas, preço, comissão)">⭐ {produto.score}</span>
      </div>
      <div className="cardTitle">{produto.title}</div>
      <div className="rating">⭐ {Number(produto.rating).toFixed(1)} · {Number(produto.sold).toLocaleString("pt-BR")} vendidos</div>
      {antigo !== null && antigo > preco ? <div className="oldPrice">De {brl(antigo)}</div> : null}
      <div className="price">{brl(preco)}</div>
      {economia > 0 ? <div className="savings">Economize {brl(economia)}</div> : null}
      <a className="buy" href={ver}>Ver oferta no {loja}</a>
      <div style={{ marginTop: 8 }}><Link href={ver} className="secondary" style={{ textDecoration: "none", fontSize: 12 }}>Rastreado via /ver</Link></div>
    </div>
  </article>;
}
