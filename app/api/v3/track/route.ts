import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TIPOS_EVENTO, limparRotulo, type TipoEvento } from "@/lib/v3-track";

// POST /api/v3/track { offer_id?, tipo, source?, campaign?, session_id? }
// Analytics de visualização (page_view, offer_view, category_view,
// whatsapp_click, social_click). Público, sem PII (sem IP/UA).
// Sempre responde ok para nunca quebrar a navegação.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      offer_id?: string;
      tipo?: string;
      source?: string;
      campaign?: string;
      session_id?: string;
    };
    const tipo = (body.tipo || "").trim() as TipoEvento;
    if (!(TIPOS_EVENTO as readonly string[]).includes(tipo)) {
      return NextResponse.json({ ok: true });
    }
    const supabase = await createClient();
    await supabase.from("offer_events").insert({
      offer_id: (body.offer_id || "").trim() || null,
      tipo,
      source: limparRotulo(body.source, 40),
      campaign: limparRotulo(body.campaign),
      session_id: limparRotulo(body.session_id, 80),
    });
  } catch {
    // Analytics nunca quebra a página.
  }
  return NextResponse.json({ ok: true });
}
