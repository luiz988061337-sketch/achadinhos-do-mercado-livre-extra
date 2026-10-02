// Integração Mercado Livre — API OFICIAL (somente leitura, server-only).
// Docs: https://developers.mercadolivre.com.br
// - Descoberta: GET /products/search (CATÁLOGO: nome, imagem, categoria).
//   A busca de ANÚNCIOS com preço (/sites/MLB/search) está bloqueada pelo ML
//   para qualquer token (403) — por isso o preço/link vão por curadoria.
// - Item: GET /items/MLB123 (quando disponível, enriquece preço).
// - Auth: app token via client_credentials; user token opcional (OAuth).
// REGRAS:
// - Nunca transformar link comum em link de afiliado por método não oficial.
// - affiliate_url fica NULL até o admin colar o link oficial da Central de Afiliados.
// - price=0 + url="" significa "a preencher na aprovação" (só existe em pending).

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

const ML_CATALOG_SEARCH = "https://api.mercadolibre.com/products/search";
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

async function headersMl(userToken?: string | null): Promise<Record<string, string>> {
  const h: Record<string, string> = { Accept: "application/json", "User-Agent": UA };
  // Preferência: user token (conta conectada) — único que libera a search.
  if (userToken) {
    h.Authorization = `Bearer ${userToken}`;
    return h;
  }
  const token = await obterToken().catch(() => null);
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export class MlLimite extends Error {}

function erroMl(status: number, temUserToken: boolean): Error {
  if (status === 429) {
    return new MlLimite("ML limitou as buscas (429). Aguarde cerca de 1 minuto e tente de novo.");
  }
  if (status === 401 || status === 403) {
    return new MlNaoConfigurado(
      temUserToken
        ? "ML recusou a busca mesmo conectado. Confira os escopos do app e tente reconectar."
        : "ML exigiu autenticação. Configure ML_CLIENT_ID + ML_CLIENT_SECRET no servidor (app oficial)."
    );
  }
  return new Error(`ML search falhou: ${status}`);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function buscarML(termo: string, limit = 20, userToken?: string | null): Promise<MlOfertaNormalizada[]> {
  const q = (termo || "").trim();
  if (!q) return [];
  // Catálogo oficial (funciona com app token). Traz nome/imagem/categoria;
  // preço e link da oferta são preenchidos na aprovação (curadoria).
  // 429 = rate limit do ML: espera 2,5s e tenta 1x de novo.
  const url = `${ML_CATALOG_SEARCH}?site_id=MLB&status=active&q=${encodeURIComponent(q)}&limit=${clampLimit(limit)}`;
  let res = await fetch(url, {
    headers: await headersMl(userToken),
    // Server-only: esta lib nunca é importada no cliente.
    cache: "no-store",
  });
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 2500));
    res = await fetch(url, { headers: await headersMl(userToken), cache: "no-store" });
  }
  if (!res.ok) throw erroMl(res.status, Boolean(userToken));
  const json = await res.json();
  const results: unknown[] = Array.isArray(json?.results) ? json.results : [];
  return results.map((r) => normalizarCatalogo(r as Record<string, unknown>)).filter((p): p is MlOfertaNormalizada => p !== null);
}

export async function detalharML(id: string, userToken?: string | null): Promise<MlOfertaNormalizada | null> {
  const mlb = normalizarMlbId(id);
  if (!mlb) return null;
  const res = await fetch(`${ML_ITEM}/${mlb}`, { headers: await headersMl(userToken), cache: "no-store" });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw erroMl(res.status, Boolean(userToken));
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

// Normaliza item do CATÁLOGO (/products/search): nome, imagem, categoria.
// Preço e URL da oferta NÃO vêm no catálogo → ficam 0/"" ("a preencher"
// na aprovação). Registro catalogado nunca é publicado sem curadoria.
function normalizarCatalogo(it: Record<string, unknown>): MlOfertaNormalizada | null {
  try {
    const rawId = String(it.id ?? "");
    const mlb = normalizarMlbId(rawId);
    if (!mlb) return null;
    const title = String(it.name ?? it.title ?? "").trim();
    if (!title) return null;
    const pics = Array.isArray(it.pictures) ? (it.pictures as { url?: unknown }[]) : [];
    const image = String(pics[0]?.url || "").replace("http://", "https://");
    if (!image.startsWith("https://")) return null;
    const base = {
      external_id: mlb,
      title,
      image,
      price: 0,
      old_price: null,
      discount: null,
      rating: 0,
      reviews: 0,
      sold: 0,
      url: `https://www.mercadolivre.com.br/p/${mlb}`,
      affiliate_url: null,
      marketplace: "mercadolivre" as const,
      category: typeof it.domain_id === "string" ? it.domain_id : null,
    };
    const { score } = calcularScore({ ...base, rating: 0, reviews: 0 });
    return { ...base, score };
  } catch {
    return null;
  }
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
