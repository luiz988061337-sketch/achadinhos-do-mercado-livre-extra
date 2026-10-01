// Etiquetas de origem/canal (FASE 12). Identificação interna de onde
// veio o clique. Não cria nada no Mercado Livre — é só registro nosso.
// Uso: links do site podem levar ?origem=ACHADINHOS_SITE; posts sociais
// usam a etiqueta do canal correspondente.

export const CANAIS = [
  { id: "ACHADINHOS_SITE", rotulo: "Site" },
  { id: "ACHADINHOS_INSTAGRAM", rotulo: "Instagram" },
  { id: "ACHADINHOS_TIKTOK", rotulo: "TikTok" },
  { id: "ACHADINHOS_WHATSAPP", rotulo: "WhatsApp" },
  { id: "ACHADINHOS_FACEBOOK", rotulo: "Facebook" },
  { id: "ACHADINHOS_YOUTUBE", rotulo: "YouTube" },
  { id: "ACHADINHOS_PINTEREST", rotulo: "Pinterest" }
] as const;

export type CanalId = (typeof CANAIS)[number]["id"];

export function normalizarOrigem(valor: string | null | undefined): string {
  const v = (valor || "").trim().toUpperCase();
  return CANAIS.some((c) => c.id === v) ? v : "ACHADINHOS_SITE";
}

export function rotuloOrigem(valor: string | null | undefined): string {
  const v = (valor || "").trim().toUpperCase();
  return CANAIS.find((c) => c.id === v)?.rotulo ?? v ?? "—";
}
