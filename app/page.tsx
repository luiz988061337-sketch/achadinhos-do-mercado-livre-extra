import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import CarrosselOfertas from "@/components/CarrosselOfertas";
import { categorias } from "@/lib/categorias";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: destaques }, { data: recentes }, { count }] = await Promise.all([
    supabase.from("produtos").select("*").eq("ativo", true).eq("destaque", true).order("created_at", { ascending: false }).limit(10),
    supabase.from("produtos").select("*").eq("ativo", true).order("created_at", { ascending: false }).limit(8),
    supabase.from("produtos").select("*", { count: "exact", head: true }).eq("ativo", true)
  ]);
  const emDestaque = destaques ?? [];
  const lista = recentes ?? [];

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

    {emDestaque.length > 0 ? <CarrosselOfertas titulo="🔥 Ofertas em destaque" subtitulo="Os achadinhos mais procurados — arraste para ver mais" produtos={emDestaque} /> : null}

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
