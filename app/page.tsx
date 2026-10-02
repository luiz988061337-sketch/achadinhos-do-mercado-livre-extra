import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ProductCardV4 from "@/components/ProductCardV4";
import CarrosselOfertas from "@/components/CarrosselOfertas";
import { categorias } from "@/lib/categorias";
import { topClicados } from "@/lib/ranking";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: destaques }, { data: recentes }, { count }] = await Promise.all([
    supabase.from("produtos").select("*").eq("ativo", true).eq("destaque", true).order("prioridade", { ascending: false }).order("created_at", { ascending: false }).limit(10),
    supabase.from("produtos").select("*").eq("ativo", true).order("created_at", { ascending: false }).limit(8),
    supabase.from("produtos").select("*", { count: "exact", head: true }).eq("ativo", true)
  ]);
  const emDestaque = destaques ?? [];
  const lista = recentes ?? [];

  // 🔥 Em alta: mais clicados nos últimos 7 dias (dados reais de cliques).
  const topIds = await topClicados(supabase, 7, 8);
  let emAlta: any[] = [];
  if (topIds.length > 0) {
    const { data } = await supabase.from("produtos").select("*").in("id", topIds.map((t) => t.produto_id)).eq("ativo", true);
    const cliques = new Map(topIds.map((t) => [t.produto_id, t.cliques]));
    emAlta = (data ?? []).sort((a: any, b: any) => (cliques.get(b.id) ?? 0) - (cliques.get(a.id) ?? 0));
  }

  // V4: vitrine de aprovados (ML + Shopee) por score — não altera o legado.
  const { data: v4aprovados } = await supabase.from("products").select("*").eq("status", "approved").order("score", { ascending: false }).limit(8);
  const v4lista = v4aprovados ?? [];

  return <div className="container">
    <section className="hero" aria-labelledby="hero-titulo">
      <div>
        <h1 id="hero-titulo">Achadinhos que valem cada centavo 🔥</h1>
        <p>Garimpamos as melhores ofertas do Mercado Livre pra você nunca mais pagar caro.</p>
        <ul className="heroBullets">
          <li>✅ Curadoria de verdade</li>
          <li>💸 Desconto real</li>
          <li>🔒 Compra no Mercado Livre</li>
        </ul>
        <div className="heroCtas">
          <Link href="/ofertas" className="cta">🔥 Ver ofertas de hoje</Link>
          <Link href="#categorias" className="ctaGhost">Ver categorias</Link>
        </div>
      </div>
      <div className="heroEmoji" aria-hidden="true">🛒</div>
    </section>

    <div className="notice">Alguns links deste site são links de afiliado. Podemos receber uma comissão quando uma compra é realizada através deles.</div>

    {emDestaque.length > 0 ? <CarrosselOfertas titulo="🔥 Ofertas em destaque" subtitulo="Escolhidas a dedo — arraste para ver mais" produtos={emDestaque} /> : null}

    {emAlta.length > 0 ? <section className="section" aria-labelledby="alta-titulo">
      <div className="sectionHeader"><h2 id="alta-titulo">📈 Em alta na semana</h2><Link href="/ofertas?ordem=cliques" className="seeAll">Ver mais clicados</Link></div>
      <div className="products">{emAlta.map((p) => <ProductCard key={p.id} produto={p} />)}</div>
    </section> : null}

    {v4lista.length > 0 ? <section className="section" aria-labelledby="v4-titulo">
      <div className="sectionHeader"><h2 id="v4-titulo">🆕 Achadinhos ML + Shopee (aprovados)</h2><Link href="/ofertas" className="seeAll">Ver ofertas</Link></div>
      <div className="products">{v4lista.map((p) => <ProductCardV4 key={p.id} produto={p} />)}</div>
    </section> : null}

    <section className="section" aria-labelledby="cats-titulo" id="categorias">
      <div className="sectionHeader"><h2 id="cats-titulo">🗂️ Categorias</h2><Link href="/ofertas" className="seeAll">Ver produtos</Link></div>
      <div className="categories">{categorias.map(c => <Link key={c.slug} href={`/categoria/${c.slug}`} className="category"><span className="categoryIcon" aria-hidden="true">{c.icone}</span>{c.nome}</Link>)}</div>
    </section>

    <section className="section" aria-labelledby="nov-titulo">
      <div className="sectionHeader"><h2 id="nov-titulo">🆕 Chegaram agora</h2><Link href="/ofertas" className="seeAll">Ver {count !== null ? `${count} ofertas` : "todas"}</Link></div>
      <div className="products">{lista.map(p => <ProductCard key={p.id} produto={p} />)}</div>
      {lista.length === 0 && <div className="notice">Cadastre os primeiros produtos no painel administrativo.</div>}
    </section>

    <section className="section" aria-label="Por que comprar aqui">
      <div className="trustStrip">
        <div className="trustItem"><span aria-hidden="true">✅</span>Curadoria de verdade, sem spam</div>
        <div className="trustItem"><span aria-hidden="true">💸</span>Desconto e economia à mostra</div>
        <div className="trustItem"><span aria-hidden="true">🔒</span>Compra 100% no Mercado Livre</div>
        <div className="trustItem"><span aria-hidden="true">⚡</span>Ofertas atualizadas sempre</div>
      </div>
    </section>
  </div>;
}
