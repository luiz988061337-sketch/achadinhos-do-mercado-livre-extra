import { notFound } from "next/navigation";
import Link from "next/link";
import ProductCard, { brl } from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";

export default async function ProdutoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: produto } = await supabase.from("produtos").select("*").eq("slug", slug).eq("ativo", true).single();
  if (!produto) notFound();

  const { data: relacionados } = await supabase
    .from("produtos").select("*")
    .eq("ativo", true).eq("categoria_slug", produto.categoria_slug).neq("id", produto.id)
    .limit(4);

  const preco = Number(produto.preco);
  const antigo = produto.preco_antigo !== null ? Number(produto.preco_antigo) : null;
  const economia = antigo !== null && antigo > preco ? antigo - preco : 0;
  const avaliacoes = Number(produto.avaliacoes ?? 0).toLocaleString("pt-BR");
  const lista = relacionados ?? [];

  return <div className="container">
    <div className="productPage">
      <div className="productMainImage"><img src={produto.imagem} alt={produto.nome} /></div>
      <div className="productInfo">
        <nav className="breadcrumb" aria-label="Você está aqui"><Link href="/">Início</Link> / <Link href={`/categoria/${produto.categoria_slug}`}>{produto.categoria}</Link></nav>
        <div>
          {produto.destaque ? <span className="badgeHot">⭐ MAIS PROCURADO</span> : null}
          {produto.desconto ? <span className="badgeOff">{produto.desconto}% OFF</span> : null}
        </div>
        <h1>{produto.nome}</h1>
        <div className="rating" aria-label={`Nota ${produto.avaliacao} de 5, com ${avaliacoes} avaliações`}>⭐ {produto.avaliacao} · {avaliacoes} avaliações</div>
        {antigo !== null && antigo > preco ? <div className="oldPrice">De {brl(antigo)}</div> : null}
        <div className="productPrice" aria-label={`Por ${brl(preco)}`}>{brl(preco)}</div>
        {economia > 0 ? <div className="savings">Economize {brl(economia)}</div> : null}
        <p className="urgency">⚡ Oferta por tempo limitado — o preço pode mudar a qualquer momento no Mercado Livre.</p>
        <a className="bigBuy" href={`/go/${produto.id}`} target="_blank" rel="noopener sponsored" aria-label={`Ver oferta de ${produto.nome} no Mercado Livre, abre em nova aba`}>🛒 VER OFERTA NO MERCADO LIVRE</a>
        <ul className="checkList">
          <li>Compra 100% segura no Mercado Livre</li>
          <li>Desconto real sobre o preço original</li>
          <li>Avaliado por quem já comprou</li>
        </ul>
        <p>Preço e disponibilidade podem mudar no Mercado Livre.</p>
      </div>
    </div>

    <div className="stickyBuy">
      <div className="sp"><small>{produto.nome}</small><strong>{brl(preco)}</strong></div>
      <a href={`/go/${produto.id}`} target="_blank" rel="noopener sponsored" aria-label={`Ver oferta de ${produto.nome} no Mercado Livre, abre em nova aba`}>VER OFERTA</a>
    </div>

    {lista.length > 0 ? <section className="section" aria-labelledby="rel-titulo">
      <div className="sectionHeader"><h2 id="rel-titulo">🔥 Você também vai gostar</h2><Link href="/ofertas" className="seeAll">Ver todas</Link></div>
      <div className="products">{lista.map(p => <ProductCard key={p.id} produto={p} />)}</div>
    </section> : null}
  </div>;
}
