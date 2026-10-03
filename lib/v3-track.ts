// Rastreamento V3 — fontes/campanhas de cliques por oferta.
// Não altera nem mascara links de afiliado: só registra origem interna.

export const FONTES_CLICKE = [
  "site",
  "whatsapp",
  "instagram",
  "facebook",
  "tiktok",
  "organic",
  "ads",
  "other",
] as const;

export type FonteClique = (typeof FONTES_CLICKE)[number];

export function normalizarFonte(v: string | null | undefined): FonteClique {
  const s = (v || "").trim().toLowerCase();
  return (FONTES_CLICKE as readonly string[]).includes(s) ? (s as FonteClique) : "other";
}

// Texto livre curto (campanha/placement/device): aparado, sem HTML.
export function limparRotulo(v: string | null | undefined, max = 80): string | null {
  const s = (v || "").trim().replace(/[<>"']/g, "").slice(0, max);
  return s || null;
}

export const TIPOS_EVENTO = [
  "page_view",
  "offer_view",
  "category_view",
  "whatsapp_click",
  "social_click",
] as const;

export type TipoEvento = (typeof TIPOS_EVENTO)[number];
