import { NextResponse } from "next/server";
import { buscarML } from "@/lib/ml";
import { calcularScore } from "@/lib/score";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/cron/pesquisar?termo=air+fryer
// Worker de descoberta: pesquisa ML (+ Shopee se configurada), insere QUALIFICADAS como pending.
// NUNCA publica automaticamente sem ALLOW_AUTO_PUBLISH=true explícito.
// Proteção: exige CRON_SECRET (?secret= ou Authorization: Bearer).
// Configure na Vercel: CRON_SECRET + agende via Vercel Cron / scheduler externo.

const TERMOS_PADRAO = ["air fryer", "fone bluetooth", "aspirador robô"];

function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return true;
  const h = req.headers.get("authorization") || "";
  return h === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const url = new URL(req.url);
  const termos = (url.searchParams.get("termo") || "").trim()
    ? [(url.searchParams.get("termo") as string).trim()]
    : (process.env.CRON_TERMOS || "").split(",").map((t) => t.trim()).filter(Boolean).length > 0
      ? (process.env.CRON_TERMOS as string).split(",").map((t) => t.trim()).filter(Boolean)
      : TERMOS_PADRAO;

  const autoPublish = (process.env.ALLOW_AUTO_PUBLISH || "").toLowerCase() === "true";
  const supabase = await createAdminClient();
  let pesquisados = 0;
  let pendentes = 0;
  const pulados: string[] = [];
  const erros: string[] = [];

  for (const termo of termos.slice(0, 5)) {
    let itens: Awaited<ReturnType<typeof buscarML>> = [];
    try {
      itens = await buscarML(termo, 15);
    } catch (e) {
      erros.push(`${termo}: ${e instanceof Error ? e.message : "falha ML"}`);
      continue;
    }
    pesquisados += itens.length;

    // Qualificação mínima: preço válido + imagem + url. Score recalculado.
    const qualificados = itens.filter((it) => it.price > 0 && it.image.startsWith("https://") && it.url.startsWith("https://"));

    for (const it of qualificados.slice(0, 15)) {
      const { score } = calcularScore({ price: it.price, old_price: it.old_price, discount: it.discount, sold: it.sold, rating: 0, reviews: 0 });
      // Só insere se não existir (marketplace+external_id) — evita duplicata.
      const { data: existe } = await supabase.from("products").select("id").eq("marketplace", "mercadolivre").eq("external_id", it.external_id).maybeSingle();
      if (existe) {
        pulados.push(it.external_id);
        continue;
      }
      const status = autoPublish ? "approved" : "pending";
      // autoPublish exige affiliate — sem link oficial, mantém pending mesmo com flag.
      const { error } = await supabase.from("products").insert({
        title: it.title, image: it.image, price: it.price, old_price: it.old_price,
        discount: it.discount, rating: 0, reviews: 0, sold: it.sold, url: it.url,
        affiliate_url: null, marketplace: "mercadolivre", score,
        status: autoPublish ? "pending" : status,
        external_id: it.external_id, category: it.category,
      });
      if (!error) pendentes++;
      else if (/Approved.*affiliate|approved_requires_affiliate/i.test(error.message)) pulados.push(it.external_id);
      else erros.push(`${it.external_id}: ${error.message}`);
    }
  }

  // Shopee no cron: só se credenciais presentes (best-effort, sem quebrar o job do ML).
  let shopee = { pesquisados: 0, pendentes: 0, aviso: "" };
  if (process.env.SHOPEE_APP_ID && process.env.SHOPEE_APP_SECRET) {
    try {
      const { buscarShopee } = await import("@/lib/shopee");
      for (const termo of termos.slice(0, 2)) {
        const itens = await buscarShopee(termo, 10).catch(() => []);
        shopee.pesquisados += itens.length;
        for (const it of itens.slice(0, 10)) {
          const { data: existe } = await supabase.from("products").select("id").eq("marketplace", "shopee").eq("external_id", it.external_id).maybeSingle();
          if (existe) continue;
          const { score } = calcularScore({ price: it.price, old_price: it.old_price, discount: it.discount, rating: it.rating, reviews: it.reviews, sold: it.sold, commission_rate: it.commission_rate });
          const { error } = await supabase.from("products").insert({
            title: it.title, image: it.image, price: it.price, old_price: it.old_price,
            discount: it.discount, rating: it.rating, reviews: it.reviews, sold: it.sold,
            url: it.url, affiliate_url: it.affiliate_url, marketplace: "shopee",
            commission: it.commission, commission_rate: it.commission_rate,
            score, status: "pending", external_id: it.external_id, category: it.category,
          });
          if (!error) {
            pendentes++;
            shopee.pendentes++;
          }
        }
      }
    } catch (e) {
      shopee.aviso = e instanceof Error ? e.message : "Shopee indisponível no cron.";
    }
  } else {
    shopee.aviso = "Shopee sem credenciais — pulada (configure SHOPEE_APP_ID/SECRET).";
  }

  return NextResponse.json({ termos, pesquisados, pendentes, pulados: pulados.length, erros, autoPublish: false, shopee, nota: "Novos produtos entram como pending. Publicação é manual no painel." });
}
