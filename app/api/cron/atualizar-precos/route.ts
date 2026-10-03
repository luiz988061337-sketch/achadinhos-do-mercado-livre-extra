import { NextResponse } from "next/server";
import { detalharML } from "@/lib/ml";
import { calcularScore } from "@/lib/score";
import { montarMensagemOferta } from "@/lib/whatsapp";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/cron/atualizar-precos?secret=...
// Atualiza preço/imagem/url dos products do ML via API oficial (items/:id).
// Recalcula score, identifica novas ofertas (queda de preço) e registra log.
// Queda de preço em produto APROVADO com affiliate oficial → entra sozinha na
// fila do WhatsApp (status queued + log price_drop_queued), sem auto-envio.
// Evita duplicata: pula se já houver item queued, ou sent nos últimos 7 dias.
// Shopee: pula (preço via Open API exige itemId em lote — fica para evolução).
// Proteção: CRON_SECRET. Nunca publica nada — só atualiza dados.

function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return true;
  return (req.headers.get("authorization") || "") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const url = new URL(req.url);
  const limite = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "30")));

  const supabase = await createAdminClient();
  // Expira ofertas vencidas (published + expires_at passado → expired). Idempotente.
  let expiradas = 0;
  try {
    const agora = new Date().toISOString();
    const { count } = await supabase.from("offers").update({ status: "expired" }, { count: "exact" }).eq("status", "published").lt("expires_at", agora);
    expiradas = count ?? 0;
  } catch {
    expiradas = 0;
  }
  let userToken: string | null = null;
  try {
    const { obterTokenUsuario } = await import("@/lib/ml-user");
    userToken = await obterTokenUsuario(supabase as never);
  } catch {
    userToken = null;
  }
  const { data: prods } = await supabase
    .from("products")
    .select("id, external_id, title, price, old_price, discount, affiliate_url, url, marketplace, status")
    .eq("marketplace", "mercadolivre")
    .in("status", ["pending", "approved"])
    .order("updated_at", { ascending: true })
    .limit(limite);

  let atualizados = 0;
  let quedas = 0;
  let filaWa = 0;
  const erros: string[] = [];

  for (const p of prods ?? []) {
    if (!p.external_id) continue;
    try {
      const det = await detalharML(p.external_id, userToken);
      if (!det) continue;
      const precoAntigo = Number(p.price);
      const mudou = det.price !== precoAntigo;
      const caiu = det.price < precoAntigo;
      const { score } = calcularScore({ price: det.price, old_price: det.old_price, discount: det.discount, sold: det.sold, rating: 0, reviews: 0 });
      const patch: Record<string, unknown> = {
        price: det.price, old_price: det.old_price, discount: det.discount,
        sold: det.sold, image: det.image, url: det.url, score,
      };
      // Se caiu o preço de um aprovado, mantém aprovado (só dados). Se pending, continua pending.
      const { error } = await supabase.from("products").update(patch).eq("id", p.id);
      if (!error) {
        atualizados++;
        if (mudou && caiu) quedas++;
        // Queda em aprovado com affiliate oficial → fila do WhatsApp (sem auto-envio).
        if (mudou && caiu && p.status === "approved" && p.affiliate_url) {
          try {
            const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const { data: jaNaFila } = await supabase
              .from("whatsapp_queue")
              .select("id")
              .eq("product_id", p.id)
              .eq("status", "queued")
              .limit(1);
            const { data: enviadoRecente } = await supabase
              .from("whatsapp_queue")
              .select("id")
              .eq("product_id", p.id)
              .eq("status", "sent")
              .gte("sent_at", seteDiasAtras)
              .limit(1);
            if ((!jaNaFila || jaNaFila.length === 0) && (!enviadoRecente || enviadoRecente.length === 0)) {
              const message = montarMensagemOferta({
                title: p.title,
                price: det.price,
                old_price: det.old_price,
                discount: det.discount,
                affiliate_url: p.affiliate_url,
                url: det.url || p.url,
              });
              const { data: fila } = await supabase
                .from("whatsapp_queue")
                .insert({ product_id: p.id, status: "queued", message })
                .select("id")
                .single();
              if (fila) {
                filaWa++;
                await supabase.from("whatsapp_logs").insert({
                  queue_id: fila.id,
                  product_id: p.id,
                  action: "price_drop_queued",
                  result: `Queda ${precoAntigo} → ${det.price}. Adicionado à fila para envio manual.`,
                });
              }
            }
          } catch {
            // Fila WA é best-effort: não quebra o cron de preços.
          }
        }
      }
      // Respeito ao rate-limit da API oficial: pequena pausa.
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      erros.push(`${p.external_id}: ${e instanceof Error ? e.message : "falha"}`);
    }
  }

  return NextResponse.json({ verificados: (prods ?? []).length, atualizados, quedas_de_preco: quedas, fila_whatsapp: filaWa, expiradas, erros: erros.slice(0, 20) });
}
