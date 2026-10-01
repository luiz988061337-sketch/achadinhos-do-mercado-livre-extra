import ProductCard from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";

export default async function Ofertas({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const supabase = await createClient();
  let query = supabase.from("produtos").select("*").eq("ativo", true)
    .order("desconto", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (q) query = query.ilike("nome", `%${q}%`);
  const { data } = await query;
  const lista = data ?? [];

  return <div className="container">
    <div className="pageTitle">
      <h1>{q ? `🔎 Resultados para "${q}"` : "🔥 Ofertas de hoje"}</h1>
      <p aria-live="polite">{lista.length === 0 ? "Nenhum produto encontrado." : `${lista.length} ${lista.length === 1 ? "achadinho" : "achadinhos"} esperando por você — do maior desconto para o menor.`}</p>
    </div>
    <div className="products">{lista.map(p => <ProductCard key={p.id} produto={p} />)}</div>
  </div>;
}
