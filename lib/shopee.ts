// Integração Shopee Affiliate Open API — SERVER-ONLY.
// NUNCA importe este arquivo no cliente ("use client" ou componente com interatividade).
// Secrets (SHOPEE_APP_ID / SHOPEE_APP_SECRET) ficam só em variáveis de ambiente do servidor.
//
// Configuração (Vercel → Environment Variables + .env.local):
//   SHOPEE_APP_ID=...
//   SHOPEE_APP_SECRET=...
//   SHOPEE_API_BASE=https://open-api.affiliate.shopee.com.br (opcional; default abaixo)
//   Shopee → Affiliate → Open API para obter APP_ID/SECRET oficiais.
//
// Fluxo oficial:
// 1. buscarShopee(termo): chama a Open API com assinatura HMAC e retorna ofertas normalizadas.
// 2. O link de afiliado (affiliate_url) vem DA API — nunca montar manualmente.
// 3. Sem credenciais: lança erro amigável (o painel mostra "configure APP_ID/SECRET").
//
// Nota: a Shopee pode versionar o path GraphQL/REST. O base é configurável via
// SHOPEE_API_BASE para não quebrar com mudanças de versão. O código tenta o
// endpoint GraphQL oficial e faz fallback de erro legível.

import { createHmac } from "crypto";
import { calcularScore } from "@/lib/score";

export type ShopeeOfertaNormalizada = {
  external_id: string;
  title: string;
  image: string;
  price: number;
  old_price: number | null;
  discount: number | null;
  rating: number;
  reviews: number;
  sold: number;
  url: string;
  affiliate_url: string | null;
  marketplace: "shopee";
  category: string | null;
  commission: number | null;
  commission_rate: number | null;
  score: number;
};

const DEFAULT_BASE = "https://open-api.affiliate.shopee.com.br";

function credenciais(): { appId: string; secret: string; base: string } {
  const appId = (process.env.SHOPEE_APP_ID || "").trim();
  const secret = (process.env.SHOPEE_APP_SECRET || process.env.SHOPEE_SECRET || "").trim();
  const base = (process.env.SHOPEE_API_BASE || DEFAULT_BASE).replace(/\/$/, "");
  if (!appId || !secret) {
    throw new Error(
      "Shopee não configurada: defina SHOPEE_APP_ID e SHOPEE_APP_SECRET nas variáveis de ambiente do servidor."
    );
  }
  return { appId, secret, base };
}

// Assinatura padrão da Open API Shopee (HMAC-SHA256 de appId+timestamp+payload).
export function assinarShopee(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function buscarShopee(termo: string, limit = 20): Promise<ShopeeOfertaNormalizada[]> {
  const { appId, secret, base } = credenciais();
  const q = (termo || "").trim();
  if (!q) return [];
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Query GraphQL oficial de busca de ofertas (campos mínimos estáveis).
  const query = `
    query SearchOffers($keyword: String!, $limit: Int!) {
      productOfferV2(keyword: $keyword, limit: $limit) {
        nodes {
          itemId
          productName
          imageUrl
          priceMin
          priceMax
          priceDiscountRate
          ratingStar
          sales
          offerLink
          commissionRate
          shopName
        }
      }
    }`;
  const body = JSON.stringify({ query, variables: { keyword: q, limit: Math.min(50, Math.max(1, limit)) } });
  const signature = assinarShopee(secret, appId + timestamp + body);

  const res = await fetch(`${base}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
    },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    const texto = await res.text().catch(() => "");
    throw new Error(`Shopee API falhou (${res.status}). Confira APP_ID/SECRET e a região da conta. ${texto.slice(0, 200)}`);
  }
  const json = await res.json();
  if (json?.errors?.length) throw new Error(`Shopee API: ${json.errors[0]?.message || "erro desconhecido"}`);
  const nodes: unknown[] = json?.data?.productOfferV2?.nodes ?? [];
  return nodes.map((n) => normalizarShopeeNode(n as Record<string, unknown>)).filter((p): p is ShopeeOfertaNormalizada => p !== null);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizarShopeeNode(n: Record<string, unknown>): ShopeeOfertaNormalizada | null {
  try {
    const external_id = String(n.itemId ?? n.item_id ?? "").trim();
    const title = String(n.productName ?? n.title ?? "").trim();
    const price = num(n.priceMin ?? n.price);
    if (!external_id || !title || !(price > 0)) return null;

    const image = String(n.imageUrl ?? n.image ?? "");
    const url = String(n.offerLink ?? n.url ?? "");
    // affiliate_url SÓ se a API retornar link de afiliado explícito; senão null (aguarda link oficial).
    const aff = String(n.affiliateLink ?? n.aff_link ?? "");
    const commissionRate = n.commissionRate != null ? num(n.commissionRate) : null;
    const discountRaw = num(n.priceDiscountRate);
    const discount = discountRaw > 0 && discountRaw <= 90 ? Math.round(discountRaw) : null;
    const old_price =
      discount !== null && discount > 0 ? +(price / (1 - discount / 100)).toFixed(2) : null;
    const base = {
      external_id,
      title,
      image,
      price,
      old_price,
      discount,
      rating: num(n.ratingStar ?? n.rating),
      reviews: num(n.ratingCount ?? 0),
      sold: num(n.sales ?? n.sold),
      url: url || `https://shopee.com.br/product/${external_id}`,
      affiliate_url: aff.startsWith("https://") ? aff : null,
      marketplace: "shopee" as const,
      category: typeof n.shopName === "string" ? n.shopName : null,
      commission: null,
      commission_rate: commissionRate,
    };
    const commission =
      commissionRate !== null && price > 0 ? +((price * commissionRate) / 100).toFixed(2) : null;
    const { score } = calcularScore({ ...base, commission, commission_rate: commissionRate });
    return { ...base, commission, score };
  } catch {
    return null;
  }
}
