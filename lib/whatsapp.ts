// Helpers WhatsApp — SEM automação não oficial.
// A fila (whatsapp_queue) é curadoria humana no painel; o envio usa
// SOMENTE a API oficial (WhatsApp Business / Cloud API) em server-only.
// Sem WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_ID, o envio fica "queued"
// com log explicativo — nunca usa biblioteca não oficial / número pessoal.

import type { V4Product } from "@/lib/v4-types";

export function montarMensagemOferta(p: Pick<V4Product, "title" | "price" | "old_price" | "discount" | "affiliate_url" | "url">): string {
  const preco = Number(p.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const de =
    p.old_price !== null && Number(p.old_price) > Number(p.price)
      ? ` (de ${Number(p.old_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`
      : "";
  const off = p.discount ? ` 🔥 ${p.discount}% OFF` : "";
  const link = p.affiliate_url || p.url;
  return `🔥 *ACHADINHO*${off}\n${p.title}\n💰 ${preco}${de}\n👉 ${link}\n\n_Link de afiliado: podemos receber comissão, sem custo extra._`;
}

export function whatsappConfigurado(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

// Envio oficial via Cloud API. Retorna { messageId } ou lança erro.
export async function enviarViaAPIOficial(destinatario: string, texto: string): Promise<{ messageId: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const phoneId = process.env.WHATSAPP_PHONE_ID!;
  if (!token || !phoneId) throw new Error("WhatsApp Business não configurado.");
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: destinatario,
      type: "text",
      text: { body: texto },
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`WhatsApp API (${res.status}): ${t.slice(0, 300)}`);
  }
  const json = await res.json();
  const messageId = json?.messages?.[0]?.id ?? "ok";
  return { messageId };
}
