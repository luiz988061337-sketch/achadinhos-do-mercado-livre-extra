import Link from "next/link";
import { Produto } from "@/lib/types";

export default function ProductCard({ produto }: { produto: Produto }) {
  return <article className="card">
    <Link href={`/produto/${produto.slug}`}><div className="cardImage"><img src={produto.imagem} alt={produto.nome} loading="lazy" /></div></Link>
    <div className="cardBody">
      {produto.desconto ? <span className="badge">{produto.desconto}% OFF</span> : null}
      <Link href={`/produto/${produto.slug}`} className="cardTitle">{produto.nome}</Link>
      <div className="rating">⭐ {produto.avaliacao} · {produto.avaliacoes} avaliações</div>
      {produto.preco_antigo ? <div className="oldPrice">R$ {Number(produto.preco_antigo).toFixed(2).replace(".", ",")}</div> : null}
      <div className="price">R$ {Number(produto.preco).toFixed(2).replace(".", ",")}</div>
      <a className="buy" href={`/go/${produto.id}`} target="_blank" rel="noopener noreferrer">VER OFERTA</a>
    </div>
  </article>;
}