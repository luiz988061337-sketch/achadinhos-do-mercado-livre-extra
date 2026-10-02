// Integração Mercado Livre — API OFICIAL (somente leitura, server-only).
// Docs: https://developers.mercadolivre.com.br
// - Busca: GET https://api.mercadolibre.com/sites/MLB/search?q=...&limit=...
// - Item:  GET https://api.mercadolibre.com/items/MLB123
// - Auth: o ML exige app oficial (client_credentials) para leitura via API.
//   Configure ML_CLIENT_ID + ML_CLIENT_SECRET (ou ML_ACCESS_TOKEN pronto).
//   Sem credenciais a API responde 403 — a busca retorna erro amigável.
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
const ML_OAUTH = "https://api.mercadolibre.com/oauth/token";

const UA = "AchadinhosBR/4.0 (+https://achadinhos-nine.vercel.app)";

// Token de app em memória (server-only). Expira em ~6h; renova com margem.
let tokenCache: { token: string; expiraEm: number } | null = null;

export class MlNaoConfigurado extends Error {}

function credenciais(): { clientId: string; clientSecret: string; pronto: string | null } {
  return {
    clientId: (process.env.ML_CLIENT_ID || "").trim(),
    clientSecret: (process.env.ML_CLIENT_SECRET || "").trim(),
    pronto: (process.env.ML_ACCESS_TOKEN || "").trim() || null,
  };
}

// Access token oficial via client_credentials (escopo de leitura pública).
async function obterToken(): Promise<string | null> {
  const { clientId, clientSecret, pronto } = credenciais();
  if (pronto) return pronto;
  if (!clientId || !clientSecret) return null;
  if (tokenCache && Date.now() < tokenCache.expiraEm) return tokenCache.token;
  const res = await fetch(ML_OAUTH, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": UA },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new MlNaoConfigurado("ML rejeitou as credenciais do app (client_id/secret). Confira em developers.mercadolivre.com.br.");
  const json = await res.json();
  const token = String(json?.access_token || "");
  if (!token) throw new MlNaoConfigurado("ML não retornou access_token para o app.");
  tokenCache = { token, expiraEm: Date.now() + Math.max(60, Number(json?.expires_in || 21600) - 300) * 1000 };
  return token;
}

async function headersMl(): Promise<Record<string, string>> {
  const h: Record<string, string> = { Accept: "application/json", "User-Agent": UA };
  const token = await obterToken().catch(() => null);
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function erroMl(status: number): Error {
  if (status === 401 || status === 403) {
    return new MlNaoConfigurado(
      "Mercado Livre exigiu autenticação (403). Crie um app em developers.mercadolivre.com.br e configure ML_CLIENT_ID + ML_CLIENT_SECRET nas envs do servidor."
    );
  }
  return new Error(`ML search falhou: ${status}`);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function buscarML(termo: string, limit = 20): Promise<MlOfertaNormalizada[]> {
  const q = (termo || "").trim();
  if (!q) return [];
  const res = await fetch(`${ML_SEARCH}?q=${encodeURIComponent(q)}&limit=${clampLimit(limit)}`, {
    headers: await headersMl(),
    // Server-only: esta lib nunca é importada no cliente.
    cache: "no-store",
  });
  if (!res.ok) throw erroMl(res.status);
  const json = await res.json();
  const results: unknown[] = Array.isArray(json?.results) ? json.results : [];
  return results.map((r) => normalizarMlResult(r as Record<string, unknown>)).filter((p): p is MlOfertaNormalizada => p !== null);
}

export async function detalharML(id: string): Promise<MlOfertaNormalizada | null> {
  const mlb = normalizarMlbId(id);
  if (!mlb) return null;
  const res = await fetch(`${ML_ITEM}/${mlb}`, { headers: await headersMl(), cache: "no-store" });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw erroMl(res.status);
    return null;
  }
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
