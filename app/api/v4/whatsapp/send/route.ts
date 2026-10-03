import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigirAdmin, ehErroResponse } from "@/lib/v4-guard";

// POST /api/v4/whatsapp/send { queue_id, to?, tipo?, template? }
// Envio SOMENTE via API oficial (WhatsApp Business Cloud API) — conversas 1:1.
// Grupos NÃO são suportados pela Cloud API: para grupos use o envio manual.
// - Sem WHATSAPP_ACCESS_TOKEN/PHONE_ID: mantém "queued" + log explicativo.
// - Com credenciais + `to`: envia imagem+legenda (se o produto tem imagem https)
//   ou texto; `tipo: "texto"` força texto; `template: "nome"` força template.
// - Atualiza sent/failed + log. Nunca usa automação não oficial.
export async function POST(req: Request) {
  try {
    await exigirAdmin();
  } catch (e) {
    if (ehErroResponse(e)) return e;
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  let body: { queue_id?: string; to?: string; tipo?: string; template?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const queue_id = (body.queue_id || "").trim();
  if (!queue_id) return NextResponse.json({ error: "Informe queue_id." }, { status: 400 });

  const supabase = await createClient();
  const { data: item } = await supabase.from("whatsapp_queue").select("*").eq("id", queue_id).single();
  if (!item) return NextResponse.json({ error: "Item da fila não encontrado." }, { status: 404 });
  if (item.status === "sent") return NextResponse.json({ ok: true, status: "sent", detalhe: "Já enviado." });

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    await supabase.from("whatsapp_logs").insert({
      queue_id, product_id: item.product_id, action: "send_skipped",
      result: "API oficial não configurada (WHATSAPP_ACCESS_TOKEN/PHONE_ID). Item mantido na fila.",
    });
    return NextResponse.json({ ok: false, status: "queued", aviso: "WhatsApp Business não configurado. Configure WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_ID." }, { status: 428 });
  }

  const to = (body.to || process.env.WHATSAPP_TEST_TO || "").trim();
  if (!to) return NextResponse.json({ error: "Informe `to` (número com DDI+DDD, só dígitos) ou configure WHATSAPP_TEST_TO." }, { status: 400 });

  try {
    const {
      enviarViaAPIOficial,
      enviarImagemComLegenda,
      enviarTemplateOferta,
      montarLegendaImagem,
      normalizarTelefone,
    } = await import("@/lib/whatsapp");
    if (!normalizarTelefone(to)) {
      return NextResponse.json({ error: "Número inválido. Use DDI+DDD+número com só dígitos (ex. 5511999999999)." }, { status: 400 });
    }

    const tipo = (body.tipo || "auto").toLowerCase();
    let r: { messageId: string };
    let como = "texto";

    if (body.template) {
      // Template aprovado (fora da janela de 24h). Parâmetros: título + preço.
      const { data: prod } = await supabase
        .from("products")
        .select("title, price")
        .eq("id", item.product_id)
        .maybeSingle();
      const preco = prod
        ? Number(prod.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "";
      r = await enviarTemplateOferta(to, [prod?.title ?? "Oferta", preco], body.template);
      como = `template:${body.template}`;
    } else {
      const { data: prod } = await supabase
        .from("products")
        .select("title, price, old_price, discount, affiliate_url, url, image")
        .eq("id", item.product_id)
        .maybeSingle();
      const imagem = prod && /^https:\/\//i.test(prod.image || "") ? prod.image : null;
      if (tipo !== "texto" && imagem && prod) {
        const legenda = montarLegendaImagem({
          title: prod.title,
          price: Number(prod.price),
          old_price: prod.old_price != null ? Number(prod.old_price) : null,
          discount: prod.discount,
          affiliate_url: prod.affiliate_url,
          url: prod.url,
        });
        try {
          r = await enviarImagemComLegenda(to, imagem, legenda);
          como = "imagem";
        } catch (e) {
          // Se a Meta não baixar a imagem, cai para texto (não perde o envio).
          const msg = e instanceof Error ? e.message : "";
          if (!/imagem/i.test(msg)) throw e;
          r = await enviarViaAPIOficial(to, item.message || "");
          como = "texto (fallback da imagem)";
        }
      } else {
        r = await enviarViaAPIOficial(to, item.message || "");
      }
    }
    await supabase.from("whatsapp_queue").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", queue_id);
    await supabase.from("whatsapp_logs").insert({ queue_id, product_id: item.product_id, action: "sent", result: `messageId=${r.messageId} to=${to} via=${como}` });
    return NextResponse.json({ ok: true, status: "sent", messageId: r.messageId, via: como });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha no envio.";
    await supabase.from("whatsapp_queue").update({ status: "failed" }).eq("id", queue_id);
    await supabase.from("whatsapp_logs").insert({ queue_id, product_id: item.product_id, action: "failed", error: msg });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
