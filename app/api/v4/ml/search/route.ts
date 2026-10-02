import { NextResponse } from "next/server";
import { buscarML, MlNaoConfigurado } from "@/lib/ml";

// GET /api/v4/ml/search?q=air+fryer&limit=20
// Server-only. Só LEITURA da API oficial do ML. Não salva nada, não cria afiliado.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Number(searchParams.get("limit") || "20");
    if (!q) return NextResponse.json({ error: "Informe ?q=termo." }, { status: 400 });
    const itens = await buscarML(q, limit);
    return NextResponse.json({ marketplace: "mercadolivre", total: itens.length, itens });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha na busca ML.";
    const status = e instanceof MlNaoConfigurado ? 428 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
