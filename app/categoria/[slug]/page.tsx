import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { categorias } from "@/lib/categorias";
import { createClient } from "@/lib/supabase/server";

export default async function Categoria({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categoria = categorias.find(c => c.slug === slug);
  if (!categoria) notFound();

  const supabase = await createClient();
  const { data } = await supabase.from("produtos").select("*").eq("ativo", true).eq("categoria_slug", slug).order("created_at", { ascending: false });

  return <div className="container"><div className="pageTitle"><div className="breadcrumb">Início / Categorias / {categoria.nome}</div><h1>{categoria.icone} {categoria.nome}</h1></div><div className="products">{(data ?? []).map(p => <ProductCard key={p.id} produto={p} />)}</div>{!(data ?? []).length && <div className="notice">Ainda não há produtos cadastrados nesta categoria.</div>}</div>;
}