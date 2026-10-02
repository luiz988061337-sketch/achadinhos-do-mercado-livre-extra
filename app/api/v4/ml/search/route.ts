import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buscarML, MlNaoConfigurado, MlLimite } from "@/lib/ml";

// GET /api/v4/ml/search?q=air+fryer&limit=20
// Server-only. Usa o user token da conta conectada (ml_tokens).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Number(searchParams.get("limit") || "20");
    if (!q) return NextResponse.json({ error: "Informe ?q=termo." }, { status: 400 });
    const supabase = await createClient();
    let userToken: string | null = null;
    try {
      const { obterTokenUsuario } = await import("@/lib/ml-user");
      userToken = await obterTokenUsuario(supabase);
    } catch {
      userToken = null;
    }
    const itens = await buscarML(q, limit, userToken);
    return NextResponse.json({ marketplace: "mercadolivre", total: itens.length, itens });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha na busca ML.";
    const status = e instanceof MlLimite ? 429 : e instanceof MlNaoConfigurado ? 428 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
