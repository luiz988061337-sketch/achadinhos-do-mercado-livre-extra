import { createClient } from "@/lib/supabase/server";
import OfertaForm from "@/components/OfertaForm";

// Nova oferta: escolhe um produto aprovado (V4) e os preços.
// O desconto é calculado sozinho; o score, ao salvar.
export default async function NovaOfertaPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, title, price")
    .eq("status", "approved")
    .order("score", { ascending: false })
    .limit(200);
  const produtos = ((data ?? []) as unknown as { id: string; title: string; price: number }[]).map(
    (p) => ({ id: p.id, title: p.title, price: Number(p.price) })
  );
  return (
    <>
      <h1>➕ Nova oferta</h1>
      {produtos.length === 0 ? (
        <div className="notice">
          Nenhum produto aprovado. Aprove primeiro em V4 Aprovação (“Fila WA” não é necessário).
        </div>
      ) : (
        <OfertaForm produtos={produtos} />
      )}
    </>
  );
}
