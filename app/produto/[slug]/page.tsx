import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProductCard, { brl } from "@/components/ProductCard";
import ShareButtons from "@/components/ShareButtons";
import { createClient } from "@/lib/supabase/server";
import { normalizarOrigem } from "@/lib/canais";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ origem?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase.from("produtos").select("nome, descricao, imagem, preco").eq("slug", slug).eq("ativo", true).single();
  if (!p) return { title: "Produto não encontrado | AchadinhosBR" };
  const desc = p.descricao || `${p.nome} por ${brl(Number(p.preco))}. Oferta garimpada no AchadinhosBR — preço pode mudar no Mercado Livre.`;
  return {
    title: `${p.nome} | AchadinhosBR`,
    description: desc.slice(0, 160),
    alternates: { canonical: `/produto/${slug}` },
    openGraph: { title: `${p.nome} | AchadinhosBR`, description: desc.slice(0, 200), type: "website", images: [{ url: p.imagem }] }
  };
}

export default async function ProdutoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const origem = normalizarOrigem(sp.origem);
  const comOrigem = (href: string) => `${href}?origem=${encodeURIComponent(origem)}`;
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
  const sair = comOrigem(`/sair/${produto.id}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: produto.nome,
    image: produto.imagem,
    description: produto.descricao ?? undefined,
    category: produto.categoria,
    aggregateRating: { "@type": "AggregateRating", ratingValue: produto.avaliacao, reviewCount: produto.avaliacoes }
  };

  return <div className="container">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <div className="productPage">
      <div className="productMainImage"><img src={produto.imagem} alt={produto.nome} /></div>
      <div className="productInfo">
        <nav className="breadcrumb" aria-label="Você está aqui"><Link href="/">Início</Link> / <Link href={`/categoria/${produto.categoria_slug}`}>{produto.categoria}</Link></nav>
        <div>
          {produto.destaque ? <span className="badgeHot">⭐ DESTAQUE</span> : null}
          {produto.desconto ? <span className="badgeOff">{produto.desconto}% OFF</span> : null}
        </div>
        <h1>{produto.nome}</h1>
        <div className="rating" aria-label={`Nota ${produto.avaliacao} de 5, com ${avaliacoes} avaliações`}>⭐ {produto.avaliacao} · {avaliacoes} avaliações</div>
        {produto.descricao ? <p>{produto.descricao}</p> : null}
        {antigo !== null && antigo > preco ? <div className="oldPrice">De {brl(antigo)}</div> : null}
        <div className="productPrice" aria-label={`Por ${brl(preco)}`}>{brl(preco)}</div>
        {economia > 0 ? <div className="savings">Economize {brl(economia)}</div> : null}
        <p className="rating">Preço verificado em: {produto.verificado_em ? new Date(produto.verificado_em).toLocaleDateString("pt-BR") : "—"}</p>
        <p className="urgency">⚡ Oferta por tempo limitado — o preço pode mudar a qualquer momento no Mercado Livre.</p>
        <a className="bigBuy" href={sair} aria-label={`Ver oferta de ${produto.nome} no Mercado Livre`}>Ver oferta no Mercado Livre</a>
        <ul className="checkList">
          <li>Compra 100% segura no Mercado Livre</li>
          <li>Desconto real sobre o preço original</li>
          <li>Avaliado por quem já comprou</li>
        </ul>
        <ShareButtons titulo={produto.nome} path={`/produto/${produto.slug}`} />
        <p>Preço e disponibilidade podem mudar no Mercado Livre. Site independente, sem vínculo com o Mercado Livre.</p>
      </div>
    </div>

    <div className="stickyBuy">
      <div className="sp"><small>{produto.nome}</small><strong>{brl(preco)}</strong></div>
      <a href={sair} aria-label={`Ver oferta de ${produto.nome} no Mercado Livre`}>Ver no Mercado Livre</a>
    </div>

    {lista.length > 0 ? <section className="section" aria-labelledby="rel-titulo">
      <div className="sectionHeader"><h2 id="rel-titulo">🔥 Você também vai gostar</h2><Link href="/ofertas" className="seeAll">Ver todas</Link></div>
      <div className="products">{lista.map(p => <ProductCard key={p.id} produto={p} origem={origem} />)}</div>
    </section> : null}
  </div>;
}
