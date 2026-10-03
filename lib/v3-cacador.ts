import { validarLinkAfiliado } from "@/lib/afiliado";

// Caçador de ofertas V3 — ARQUITETURA DE INTAKE (item 16 da spec).
// Recebe produtos SOMENTE de integrações oficiais/API ou cadastro e
// importação autorizados. NÃO faz scraping, não burla captcha/login/limites.
// Ao entrar: calcula score, registra preço+histórico (trigger), identifica
// desconto e deixa como `pending` para o painel aprovar ou ignorar.

export type CandidatoOferta = {
  title: string;
  image: string;
  price: number;
  old_price?: number | null;
  url: string;
  affiliate_url?: string | null;
  marketplace?: "mercadolivre" | "shopee";
  external_id?: string | null;
  category?: string | null;
  rating?: number | null;
  reviews?: number | null;
  sold?: number | null;
  commission?: number | null;
  commission_rate?: number | null;
};

export function validarCandidato(c: CandidatoOferta): { ok: boolean; motivo?: string } {
  if (!c.title?.trim()) return { ok: false, motivo: "Título obrigatório." };
  if (!/^https:\/\//i.test(c.image || "")) {
    return { ok: false, motivo: "Imagem precisa ser https:// pública." };
  }
  if (!(Number(c.price) >= 0)) return { ok: false, motivo: "Preço inválido." };
  try {
    const u = new URL(c.url);
    if (u.protocol !== "https:") return { ok: false, motivo: "URL do produto precisa ser https://." };
  } catch {
    return { ok: false, motivo: "URL do produto inválida." };
  }
  const mk = c.marketplace ?? "mercadolivre";
  if (mk !== "mercadolivre" && mk !== "shopee") {
    return { ok: false, motivo: "Marketplace precisa ser mercadolivre ou shopee." };
  }
  if (c.affiliate_url) {
    if (mk === "mercadolivre") {
      const v = validarLinkAfiliado(c.affiliate_url);
      if (!v.ok) return { ok: false, motivo: v.motivo };
    } else if (!/^https:\/\//i.test(c.affiliate_url)) {
      return { ok: false, motivo: "Link de afiliado Shopee inválido." };
    }
  }
  return { ok: true };
}
