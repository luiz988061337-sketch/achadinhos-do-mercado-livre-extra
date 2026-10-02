import { NextResponse } from "next/server";
import { detalharML } from "@/lib/ml";
import { calcularScore } from "@/lib/score";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/cron/atualizar-precos?secret=...
// Atualiza preço/imagem/url dos products do ML via API oficial (items/:id).
// Recalcula score, identifica novas ofertas (queda de preço) e registra log.
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
  const { data: prods } = await supabase
    .from("products")
    .select("id, external_id, price, old_price, marketplace, status")
    .eq("marketplace", "mercadolivre")
    .in("status", ["pending", "approved"])
    .order("updated_at", { ascending: true })
    .limit(limite);

  let atualizados = 0;
  let quedas = 0;
  const erros: string[] = [];

  for (const p of prods ?? []) {
    if (!p.external_id) continue;
    try {
      const det = await detalharML(p.external_id);
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
      }
      // Respeito ao rate-limit da API oficial: pequena pausa.
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      erros.push(`${p.external_id}: ${e instanceof Error ? e.message : "falha"}`);
    }
  }

  return NextResponse.json({ verificados: (prods ?? []).length, atualizados, quedas_de_preco: quedas, erros: erros.slice(0, 20) });
}
