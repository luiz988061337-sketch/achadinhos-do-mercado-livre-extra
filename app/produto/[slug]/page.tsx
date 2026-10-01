import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ProdutoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: produto } = await supabase.from("produtos").select("*").eq("slug", slug).eq("ativo", true).single();
  if (!produto) notFound();

  return <div className="container"><div className="productPage"><div className="productMainImage"><img src={produto.imagem} alt={produto.nome} /></div><div className="productInfo"><div className="breadcrumb"><Link href="/">Início</Link> / {produto.categoria}</div>{produto.desconto ? <span className="badge">{produto.desconto}% OFF</span> : null}<h1>{produto.nome}</h1><div className="rating">⭐ {produto.avaliacao} · {produto.avaliacoes} avaliações</div>{produto.preco_antigo ? <div className="oldPrice">R$ {Number(produto.preco_antigo).toFixed(2).replace(".", ",")}</div> : null}<div className="productPrice">R$ {Number(produto.preco).toFixed(2).replace(".", ",")}</div><p>Preço e disponibilidade podem mudar no Mercado Livre.</p><a className="bigBuy" href={`/go/${produto.id}`} target="_blank" rel="noopener noreferrer">🛒 VER OFERTA NO MERCADO LIVRE</a></div></div></div>;
}