// Integração Mercado Livre — API OFICIAL pública (somente leitura).
// Docs: https://developers.mercadolivre.com.br
// - Busca: GET https://api.mercadolibre.com/sites/MLB/search?q=...&limit=...
// - Item:  GET https://api.mercadolibre.com/items/MLB123
// REGRAS:
// - Nunca transformar link comum em link de afiliado por método não oficial.
// - affiliate_url fica NULL até o admin colar o link oficial da Central de Afiliados.
// - url = permalink oficial retornado pela API (prova de fonte oficial).

import { calcularScore } from "@/lib/score";

export type MlOfertaNormalizada = {
  external_id: string; // MLB123...
  title: string;
  image: string;
  price: number;
  old_price: number | null;
  discount: number | null;
  rating: number;
  reviews: number;
  sold: number;
  url: string;
  affiliate_url: null;
  marketplace: "mercadolivre";
  category: string | null;
  score: number;
};

const ML_SEARCH = "https://api.mercadolibre.com/sites/MLB/search";
const ML_ITEM = "https://api.mercadolibre.com/items";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function buscarML(termo: string, limit = 20): Promise<MlOfertaNormalizada[]> {
  const q = (termo || "").trim();
  if (!q) return [];
  const res = await fetch(`${ML_SEARCH}?q=${encodeURIComponent(q)}&limit=${clampLimit(limit)}`, {
    headers: { Accept: "application/json" },
    // Server-only: esta lib nunca é importada no cliente.
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ML search falhou: ${res.status}`);
  const json = await res.json();
  const results: unknown[] = Array.isArray(json?.results) ? json.results : [];
  return results.map((r) => normalizarMlResult(r as Record<string, unknown>)).filter((p): p is MlOfertaNormalizada => p !== null);
}

export async function detalharML(id: string): Promise<MlOfertaNormalizada | null> {
  const mlb = normalizarMlbId(id);
  if (!mlb) return null;
  const res = await fetch(`${ML_ITEM}/${mlb}`, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) return null;
  const it = await res.json();
  return normalizarMlResult(it);
}

function clampLimit(n: number): number {
  return Math.min(50, Math.max(1, Math.floor(n) || 20));
}

export function normalizarMlbId(valor: string): string | null {
  const m = (valor || "").match(/MLB-?(\d{4,})/i);
  return m ? `MLB${m[1]}` : null;
}

// Aceita tanto item de search quanto de items/:id (formatos levemente diferentes).
function normalizarMlResult(it: Record<string, unknown>): MlOfertaNormalizada | null {
  try {
    const rawId = String(it.id ?? it.mlb_id ?? "");
    const mlb = normalizarMlbId(rawId);
    if (!mlb) return null;
    const title = String(it.title ?? "").trim();
    const price = num(it.price);
    if (!title || !(price > 0)) return null;

    const thumbnail = String(it.thumbnail ?? it.secure_thumbnail ?? "");
    const image = thumbnail.replace("http://", "https://").replace("-I.", "-O.");
    const permalink = String(it.permalink ?? `https://produto.mercadolivre.com.br/${mlb}`);
    const sold = num(it.sold_quantity);
    // Search não traz rating; mantém 0 até curadoria manual. Item detalhado pode trazer? API oficial não expõe média — preserva 0.
    const oldPrice = it.original_price != null ? num(it.original_price) : NaN;
    const old_price = Number.isFinite(oldPrice) && oldPrice > price ? oldPrice : null;
    const discount =
      old_price !== null ? Math.round(((old_price - price) / old_price) * 100) : null;

    const base = {
      external_id: mlb,
      title,
      image,
      price,
      old_price,
      discount,
      rating: 0,
      reviews: 0,
      sold,
      url: permalink,
      affiliate_url: null,
      marketplace: "mercadolivre" as const,
      category: typeof it.category_id === "string" ? it.category_id : null,
    };
    const { score } = calcularScore(base);
    return { ...base, score };
  } catch {
    return null;
  }
}
