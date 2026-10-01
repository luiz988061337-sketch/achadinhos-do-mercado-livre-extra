import ProductCard from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";

export default async function Ofertas({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const supabase = await createClient();
  let query = supabase.from("produtos").select("*").eq("ativo", true).order("created_at", { ascending: false });
  if (q) query = query.ilike("nome", `%${q}%`);
  const { data } = await query;
  const lista = data ?? [];

  return <div className="container"><div className="pageTitle"><h1>🔥 Ofertas</h1><p>{q ? `Resultados para "${q}"` : "Produtos selecionados para você."}</p></div><div className="products">{lista.map(p => <ProductCard key={p.id} produto={p} />)}</div>{!lista.length && <p>Nenhum produto encontrado.</p>}</div>;
}