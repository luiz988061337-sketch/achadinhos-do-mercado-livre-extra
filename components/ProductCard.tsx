import Link from "next/link";
import { Produto } from "@/lib/types";

export function brl(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "";
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ProductCard({ produto }: { produto: Produto }) {
  const avaliacoes = Number(produto.avaliacoes ?? 0).toLocaleString("pt-BR");
  const preco = Number(produto.preco);
  const antigo = produto.preco_antigo !== null ? Number(produto.preco_antigo) : null;
  const economia = antigo !== null && antigo > preco ? antigo - preco : 0;

  return <article className="card">
    <Link className="cardImage" href={`/produto/${produto.slug}`} aria-label={`Ver detalhes de ${produto.nome}`}>
      <img src={produto.imagem} alt={produto.nome} loading="lazy" />
    </Link>
    <div className="cardBody">
      <div>
        {produto.destaque ? <span className="badgeHot">⭐ MAIS PROCURADO</span> : null}
        {produto.desconto ? <span className="badgeOff">{produto.desconto}% OFF</span> : null}
      </div>
      <Link href={`/produto/${produto.slug}`} className="cardTitle">{produto.nome}</Link>
      <div className="rating" aria-label={`Nota ${produto.avaliacao} de 5, com ${avaliacoes} avaliações`}>⭐ {produto.avaliacao} · {avaliacoes} avaliações</div>
      {antigo !== null && antigo > preco ? <div className="oldPrice">De {brl(antigo)}</div> : null}
      <div className="price" aria-label={`Por ${brl(preco)}`}>{brl(preco)}</div>
      {economia > 0 ? <div className="savings">Economize {brl(economia)}</div> : null}
      <a className="buy" href={`/go/${produto.id}`} target="_blank" rel="noopener sponsored" aria-label={`Ver oferta de ${produto.nome} no Mercado Livre, abre em nova aba`}>🔥 VER OFERTA</a>
    </div>
  </article>;
}
