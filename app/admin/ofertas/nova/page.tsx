import { createClient } from "@/lib/supabase/server";
import OfertaForm from "@/components/OfertaForm";

// Nova oferta: escolhe um produto aprovado (V4) e os preços.
// O desconto é calculado sozinho; o score, ao salvar.
// Aceita ?product_id= para pré-selecionar (atalho da aprovação V4).
export default async function NovaOfertaPage({
  searchParams,
}: {
  searchParams: Promise<{ product_id?: string }>;
}) {
  const sp = await searchParams;
  const pedido = (sp.product_id || "").trim();
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
  const inicial = pedido ? produtos.find((p) => p.id === pedido) ?? null : null;
  const inicialForm = inicial ? { id: inicial.id, preco: inicial.price } : null;
  return (
    <>
      <h1>➕ Nova oferta</h1>
      {pedido && !inicial ? (
        <div className="notice">Produto não está aprovado (ou não existe). Escolha outro abaixo.</div>
      ) : null}
      {produtos.length === 0 ? (
        <div className="notice">
          Nenhum produto aprovado. Aprove primeiro em V4 Aprovação (“Fila WA” não é necessário).
        </div>
      ) : (
        <OfertaForm produtos={produtos} produtoInicial={inicialForm} />
      )}
    </>
  );
}
