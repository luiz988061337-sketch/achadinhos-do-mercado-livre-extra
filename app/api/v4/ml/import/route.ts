import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigirAdmin, ehErroResponse } from "@/lib/v4-guard";
import { calcularScore } from "@/lib/score";

// POST /api/v4/ml/import  { itens: [{external_id,title,image,price,old_price,url,category,sold}] }
// Salva TODOS como pending. affiliate_url fica NULL (admin cola o oficial depois).
// Nunca publica automaticamente.
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
    const price = Math.max(0, Number(it.price) || 0);
    const url = String(it.url || "").trim();
    const image = String(it.image || "").trim();
    // Catálogo oficial pode vir sem preço/url (price=0/url=""): entra pending
    // e o admin preenche preço + link da oferta na aprovação. Exige título/imagem.
    if (!external_id || !title || !image) {
      pulados.push(external_id || title || "?");
      continue;
    }
    const old_price = it.old_price != null && Number(it.old_price) > price ? Number(it.old_price) : null;
    const discount =
      old_price !== null ? Math.round(((old_price - price) / old_price) * 100) : null;
    const sold = Math.max(0, Number(it.sold) || 0);
    const { score } = calcularScore({ price, old_price, discount, sold, rating: 0, reviews: 0 });

    const { error } = await supabase.from("products").insert({
      title,
      image,
      price,
      old_price,
      discount,
      rating: 0,
      reviews: 0,
      sold,
      url,
      affiliate_url: null,
      marketplace: "mercadolivre",
      score,
      status: "pending",
      external_id,
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
