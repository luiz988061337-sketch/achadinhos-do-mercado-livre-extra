import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigirAdmin, ehErroResponse } from "@/lib/v4-guard";
import { calcularScore } from "@/lib/score";

// POST /api/v4/shopee/import { itens: [...] }
// affiliate_url vem DA API oficial; se ausente, fica NULL até curadoria.
// Sempre pending, nunca publica sozinho.
export async function POST(req: Request) {
  try {
    await exigirAdmin();
  } catch (e) {
    if (ehErroResponse(e)) return e;
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  let body: { itens?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const itens = Array.isArray(body.itens) ? body.itens : [];
  if (itens.length === 0) return NextResponse.json({ error: "Nada para importar." }, { status: 400 });
  if (itens.length > 50) return NextResponse.json({ error: "Máximo 50 por vez." }, { status: 400 });

  const supabase = await createClient();
  let inseridos = 0;
  const pulados: string[] = [];
  const erros: string[] = [];

  for (const raw of itens) {
    const it = raw as Record<string, unknown>;
    const external_id = String(it.external_id || "").trim();
    const title = String(it.title || "").trim();
    const price = Number(it.price);
    const url = String(it.url || "").trim();
    const image = String(it.image || "").trim();
    if (!external_id || !title || !(price > 0) || !url || !image) {
      pulados.push(external_id || title || "?");
      continue;
    }
    const aff = typeof it.affiliate_url === "string" && it.affiliate_url.startsWith("https://") ? it.affiliate_url : null;
    const old_price = it.old_price != null && Number(it.old_price) > price ? Number(it.old_price) : null;
    const discount = it.discount != null ? Number(it.discount) : old_price !== null ? Math.round(((old_price - price) / old_price) * 100) : null;
    const rating = Number(it.rating) || 0;
    const reviews = Math.max(0, Number(it.reviews) || 0);
    const sold = Math.max(0, Number(it.sold) || 0);
    const commission_rate = it.commission_rate != null ? Number(it.commission_rate) : null;
    const commission = commission_rate !== null ? +((price * commission_rate) / 100).toFixed(2) : null;
    const { score } = calcularScore({ price, old_price, discount, rating, reviews, sold, commission, commission_rate });

    const { error } = await supabase.from("products").insert({
      title, image, price, old_price, discount, rating, reviews, sold, url,
      affiliate_url: aff,
      marketplace: "shopee",
      commission, commission_rate,
      score, status: "pending", external_id,
      category: typeof it.category === "string" ? it.category : null,
    });
    if (error) {
      if (/duplicate|unique/i.test(error.message)) pulados.push(external_id);
      else erros.push(`${external_id}: ${error.message}`);
    } else {
      inseridos++;
    }
  }
  return NextResponse.json({ inseridos, pulados, erros, status: "pending" });
}
