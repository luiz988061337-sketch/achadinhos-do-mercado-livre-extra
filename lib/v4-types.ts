// Tipos V4 — espelham public.products / clicks / whatsapp_queue / whatsapp_logs.
// Tabela legada `produtos`/`cliques` continua intacta; V4 convive lado a lado.

export type Marketplace = "mercadolivre" | "shopee";

export type ProductStatus = "pending" | "approved" | "rejected";

export type V4Product = {
  id: string;
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
  marketplace: Marketplace;
  commission: number | null;
  commission_rate: number | null;
  score: number;
  status: ProductStatus;
  external_id: string | null;
  category: string | null;
  created_at?: string;
  updated_at?: string;
};

export type V4Click = {
  id?: number;
  product_id: string;
  marketplace: string | null;
  created_at?: string;
  referer: string | null;
  user_agent: string | null;
  origin: string | null;
  session_id: string | null;
  ip_hash: string | null;
};

export type WhatsAppStatus = "queued" | "sent" | "failed" | "cancelled";

export type WhatsAppQueueItem = {
  id: string;
  product_id: string;
  status: WhatsAppStatus;
  message: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at?: string;
};

export const MARKETPLACES: { id: Marketplace; rotulo: string }[] = [
  { id: "mercadolivre", rotulo: "Mercado Livre" },
  { id: "shopee", rotulo: "Shopee" },
];

export function rotuloMarketplace(v: string | null | undefined): string {
  return MARKETPLACES.find((m) => m.id === v)?.rotulo ?? (v || "—");
}
