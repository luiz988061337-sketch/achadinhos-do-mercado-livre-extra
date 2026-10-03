import { createClient } from "@/lib/supabase/server";
import BotaoDistribuir from "@/components/BotaoDistribuir";

// Distribuição (V3): prepara a mensagem da oferta publicada e deixa o
// admin escolher o canal. Sem disparo automático, sem método não oficial:
// ou copia (qualquer canal permitido) ou entra na fila da Cloud API (1:1).
export default async function DistribuicaoPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("offers")
    .select("id, slug, current_price, old_price, discount_percentage, product_id, products(title, rating, reviews)")
    .eq("status", "published")
    .order("score", { ascending: false })
    .limit(50);
  const lista = ((data ?? []) as unknown as {
    id: string;
    slug: string | null;
    current_price: number;
    old_price: number | null;
    discount_percentage: number;
    product_id: string;
    products: { title: string; rating: number | null; reviews: number | null } | { title: string; rating: number | null; reviews: number | null }[] | null;
  }[]).filter((o) => o.slug);

  return (
    <>
      <h1>📣 Distribuição</h1>
      <p style={{ fontSize: 13 }}>
        Ofertas publicadas. Copie a mensagem para o canal permitido de sua escolha ou envie para a
        fila oficial (WhatsApp Business 1:1 — grupos só via cópia manual).
      </p>
      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Oferta</th>
              <th>Preço</th>
              <th>Distribuir</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((o) => {
              const p = Array.isArray(o.products) ? o.products[0] : o.products;
              const aval =
                p && Number(p.reviews) > 0
                  ? `${p.rating} (${Number(p.reviews).toLocaleString("pt-BR")})`
                  : null;
              return (
                <tr key={o.id}>
                  <td>{p?.title ?? o.slug}</td>
                  <td>
                    {Number(o.current_price).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td>
                    <BotaoDistribuir
                      productId={o.product_id}
                      titulo={p?.title ?? o.slug ?? ""}
                      preco={Number(o.current_price)}
                      precoAntigo={o.old_price != null ? Number(o.old_price) : null}
                      desconto={o.discount_percentage}
                      avaliacao={aval}
                      pathOferta={`/oferta/${o.slug}`}
                    />
                  </td>
                </tr>
              );
            })}
            {lista.length === 0 && (
              <tr>
                <td colSpan={3}>Nenhuma oferta publicada com slug.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
