import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OfertasActions from "@/components/OfertasActions";
import PublicarLote from "@/components/PublicarLote";
import { ROTULO_NIVEL, STATUS_OFERTA } from "@/lib/v3-types";

// Lista de ofertas V3 (painel). Filtros por status; ações por linha.
export default async function OfertasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = STATUS_OFERTA.some((s) => s.id === sp.status) ? (sp.status as string) : "";
  const supabase = await createClient();
  let qry = supabase.from("v3_offer_stats").select("*").limit(50);
  // A view já ordena por score; filtro opcional por status.
  if (status) qry = qry.eq("status", status);
  const { data } = await qry;
  const lista = (data ?? []) as unknown as {
    id: string;
    slug: string | null;
    status: string;
    score: number;
    score_level: "EXCELENTE" | "BOA" | "NORMAL" | "NAO_RECOMENDADA";
    current_price: number;
    discount_percentage: number;
    featured: boolean;
    title: string;
    marketplace: string;
  }[];

  return (
    <>
      <h1>🏷️ Ofertas (V3)</h1>
      <p>
        <Link href="/admin/ofertas/nova">➕ Nova oferta</Link>{" "}
        {(status === "draft" || status === "pending" || status === "approved") && lista.length > 0 ? (
          <PublicarLote ids={lista.filter((o) => ["draft", "pending", "approved"].includes(o.status)).map((o) => o.id)} />
        ) : null}
      </p>
      <p style={{ fontSize: 13 }}>
        Filtrar: <Link href="/admin/ofertas">todas</Link>{" "}
        {STATUS_OFERTA.map((s) => (
          <span key={s.id}>
            · <Link href={`/admin/ofertas?status=${s.id}`}>{s.rotulo}</Link>{" "}
          </span>
        ))}
      </p>
      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Oferta</th>
              <th>Preço</th>
              <th>Score</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/ofertas/${o.id}`}>{o.title ?? o.slug ?? o.id}</Link>
                  {o.featured ? " ⭐" : ""}
                </td>
                <td>
                  {Number(o.current_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  {o.discount_percentage > 0 ? ` (-${o.discount_percentage}%)` : ""}
                </td>
                <td>
                  {o.score}/100 — {ROTULO_NIVEL[o.score_level]}
                </td>
                <td>{STATUS_OFERTA.find((s) => s.id === o.status)?.rotulo ?? o.status}</td>
                <td>
                  <OfertasActions id={o.id} statusAtual={o.status} />
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhuma oferta. Crie a primeira em “Nova oferta”.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
