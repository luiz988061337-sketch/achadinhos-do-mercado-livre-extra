// Tipos V3 — espelham public.offers / categories / price_history / campaigns.
// Legado (`produtos`) e V4 (`products`, `clicks`) continuam intactos.

export type OfferStatus =
  | "draft"
  | "pending"
  | "approved"
  | "published"
  | "expired"
  | "rejected";

export type ScoreLevel = "EXCELENTE" | "BOA" | "NORMAL" | "NAO_RECOMENDADA";

export type Offer = {
  id: string;
  product_id: string;
  slug: string | null;
  old_price: number | null;
  current_price: number;
  discount_percentage: number;
  coupon_code: string | null;
  coupon_value: number | null;
  shipping_price: number | null;
  score: number;
  score_level: ScoreLevel;
  status: OfferStatus;
  featured: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export const STATUS_OFERTA: { id: OfferStatus; rotulo: string }[] = [
  { id: "draft", rotulo: "Rascunho" },
  { id: "pending", rotulo: "Aguardando aprovação" },
  { id: "approved", rotulo: "Aprovada" },
  { id: "published", rotulo: "Publicada" },
  { id: "expired", rotulo: "Expirada" },
  { id: "rejected", rotulo: "Rejeitada" },
];

export const ROTULO_NIVEL: Record<ScoreLevel, string> = {
  EXCELENTE: "OFERTA EXCELENTE",
  BOA: "BOA OFERTA",
  NORMAL: "OFERTA NORMAL",
  NAO_RECOMENDADA: "NÃO RECOMENDADA",
};

// Transições permitidas no painel (pausar = published -> approved).
export const TRANSICOES: Record<OfferStatus, OfferStatus[]> = {
  draft: ["pending", "approved", "rejected"],
  pending: ["approved", "rejected", "draft"],
  approved: ["published", "rejected", "draft"],
  published: ["approved", "expired"],
  expired: ["draft"],
  rejected: ["draft"],
};

export function gerarSlugOferta(titulo: string, sufixo?: string): string {
  const base = (titulo || "oferta")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const extra = (sufixo || Math.random().toString(36).slice(2, 7)).toLowerCase();
  return `${base || "oferta"}-${extra}`;
}
