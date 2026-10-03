// Helpers WhatsApp — SEM automação não oficial.
// A fila (whatsapp_queue) é curadoria humana no painel; o envio usa
// SOMENTE a API oficial (WhatsApp Business / Cloud API) em server-only.
// Sem WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_ID, o envio fica "queued"
// com log explicativo — nunca usa biblioteca não oficial / número pessoal.
//
// IMPORTANTE: a Cloud API só envia para conversas 1:1 (não posta em grupos).
// Para grupos (ex. Achadinhos 7), use o envio manual (botão Copiar).

import type { V4Product } from "@/lib/v4-types";

type OfertaTexto = Pick<
  V4Product,
  "title" | "price" | "old_price" | "discount" | "affiliate_url" | "url"
>;

export function montarMensagemOferta(p: OfertaTexto): string {
  const preco = Number(p.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const de =
    p.old_price !== null && Number(p.old_price) > Number(p.price)
      ? ` (de ${Number(p.old_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`
      : "";
  const off = p.discount ? ` 🔥 ${p.discount}% OFF` : "";
  const link = p.affiliate_url || p.url;
  return `🔥 *ACHADINHO*${off}\n${p.title}\n💰 ${preco}${de}\n👉 ${link}\n\n_Link de afiliado: podemos receber comissão, sem custo extra._`;
}

// Legenda curta (limite da Cloud API para caption de imagem: 1024 caracteres).
export function montarLegendaImagem(p: OfertaTexto, max = 1024): string {
  const cheia = montarMensagemOferta(p);
  if (cheia.length <= max) return cheia;
  const link = p.affiliate_url || p.url;
  const base =
    `🔥 *ACHADINHO*${p.discount ? ` 🔥 ${p.discount}% OFF` : ""}\n` +
    `${p.title}\n💰 ${Number(p.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}\n👉 ${link}`;
  if (base.length <= max) return base;
  return base.slice(0, max - 1) + "…";
}

export function whatsappConfigurado(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

// Normaliza para E.164 só-dígitos (ex. "+55 (11) 99999-9999" -> "5511999999999").
// Retorna null se não parecer um número válido (8 a 15 dígitos).
export function normalizarTelefone(valor: string | null | undefined): string | null {
  const digitos = (valor || "").replace(/\D+/g, "");
  if (digitos.length < 8 || digitos.length > 15) return null;
  return digitos;
}

function graphUrl(): string {
  const phoneId = process.env.WHATSAPP_PHONE_ID!;
  return `https://graph.facebook.com/v21.0/${phoneId}/messages`;
}

// Traduz erros comuns da Cloud API para mensagens acionáveis.
export function traduzirErroWhatsApp(status: number, corpo: string): string {
  const t = (corpo || "").toLowerCase();
  if (status === 401 || status === 403 || t.includes("invalid oauth") || t.includes("expired")) {
    return "Token da Cloud API inválido/expirado. Gere um novo em developers.facebook.com → seu app → WhatsApp → API Setup e atualize WHATSAPP_ACCESS_TOKEN.";
  }
  if (t.includes("template") || t.includes("re-engagement") || t.includes("24")) {
    return "Fora da janela de 24h: a Meta exige TEMPLATE aprovado para iniciar conversa. Aprove um template (ex. WHATSAPP_TEMPLATE_OFERTA) no Gerenciador do WhatsApp e informe `template` na chamada.";
  }
  if (t.includes("not on whatsapp") || t.includes("does not exist") || t.includes("invalid phone") || t.includes("131030") || t.includes("132000")) {
    return "Número inválido ou sem WhatsApp. Confira o DDD + número (só dígitos, com código do país).";
  }
  if (status === 429 || t.includes("rate limit") || t.includes("too many")) {
    return "Limite da API atingido (rate limit). Aguarde e tente de novo em alguns minutos.";
  }
  if (t.includes("media") || t.includes("download") || t.includes("image")) {
    return "A imagem não pôde ser baixada pela Meta (URL precisa ser https pública). O envio de texto continua funcionando.";
  }
  return `WhatsApp API (${status}): ${corpo.slice(0, 300)}`;
}

async function postarCloudAPI(payload: Record<string, unknown>): Promise<{ messageId: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const res = await fetch(graphUrl(), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(traduzirErroWhatsApp(res.status, t));
  }
  const json = await res.json();
  return { messageId: json?.messages?.[0]?.id ?? "ok" };
}

// Envio de texto oficial. Retorna { messageId } ou lança erro traduzido.
export async function enviarViaAPIOficial(
  destinatario: string,
  texto: string
): Promise<{ messageId: string }> {
  if (!whatsappConfigurado()) throw new Error("WhatsApp Business não configurado.");
  const to = normalizarTelefone(destinatario);
  if (!to) throw new Error("Número inválido. Use DDD + número com código do país (só dígitos).");
  return postarCloudAPI({ to, type: "text", text: { body: texto } });
}

// Envio de imagem (URL https pública) + legenda. Fallback: use texto puro.
export async function enviarImagemComLegenda(
  destinatario: string,
  imageUrl: string,
  legenda: string
): Promise<{ messageId: string }> {
  if (!whatsappConfigurado()) throw new Error("WhatsApp Business não configurado.");
  const to = normalizarTelefone(destinatario);
  if (!to) throw new Error("Número inválido. Use DDD + número com código do país (só dígitos).");
  if (!/^https:\/\//i.test(imageUrl || "")) {
    throw new Error("URL da imagem precisa ser https:// pública.");
  }
  return postarCloudAPI({
    to,
    type: "image",
    image: { link: imageUrl, caption: (legenda || "").slice(0, 1024) },
  });
}

// Envio por TEMPLATE aprovado (obrigatório fora da janela de 24h).
// Crie o template no Gerenciador do WhatsApp (categoria Marketing) e
// configure WHATSAPP_TEMPLATE_OFERTA com o nome exato.
// bodyParams: valores dos parâmetros {{1}}, {{2}}... do corpo do template.
export async function enviarTemplateOferta(
  destinatario: string,
  bodyParams: string[],
  templateName?: string,
  languageCode = "pt_BR"
): Promise<{ messageId: string }> {
  if (!whatsappConfigurado()) throw new Error("WhatsApp Business não configurado.");
  const to = normalizarTelefone(destinatario);
  if (!to) throw new Error("Número inválido. Use DDD + número com código do país (só dígitos).");
  const name = (templateName || process.env.WHATSAPP_TEMPLATE_OFERTA || "").trim();
  if (!name) {
    throw new Error(
      "Template não configurado. Aprove um template no Gerenciador do WhatsApp e defina WHATSAPP_TEMPLATE_OFERTA."
    );
  }
  return postarCloudAPI({
    to,
    type: "template",
    template: {
      name,
      language: { code: languageCode },
      components: [
        {
          type: "body",
          parameters: bodyParams.map((text) => ({ type: "text", text: String(text ?? "") })),
        },
      ],
    },
  });
}
