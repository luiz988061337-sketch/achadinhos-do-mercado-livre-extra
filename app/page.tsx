import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { categorias } from "@/lib/categorias";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: produtos } = await supabase.from("produtos").select("*").eq("ativo", true).order("created_at", { ascending: false }).limit(8);
  const lista = produtos ?? [];

  return <div className="container">
    <section className="hero"><div><h1>Achadinhos que valem a pena.</h1><p>Encontre ofertas e produtos selecionados em um só lugar.</p><Link href="/ofertas" className="cta">🔥 Ver ofertas</Link></div><div className="heroEmoji">🛒</div></section>
    <div className="notice">Alguns links deste site são links de afiliado. Podemos receber uma comissão quando uma compra é realizada através deles.</div>
    <section className="section"><div className="sectionHeader"><h2>🗂️ Categorias</h2><Link href="/ofertas" className="seeAll">Ver produtos</Link></div><div className="categories">{categorias.map(c => <Link key={c.slug} href={`/categoria/${c.slug}`} className="category"><span className="categoryIcon">{c.icone}</span>{c.nome}</Link>)}</div></section>
    <section className="section"><div className="sectionHeader"><h2>🔥 Produtos em destaque</h2><Link href="/ofertas" className="seeAll">Ver todos</Link></div><div className="products">{lista.map(p => <ProductCard key={p.id} produto={p} />)}</div>{lista.length===0 && <div className="notice">Cadastre os primeiros produtos no painel administrativo.</div>}</section>
  </div>;
}