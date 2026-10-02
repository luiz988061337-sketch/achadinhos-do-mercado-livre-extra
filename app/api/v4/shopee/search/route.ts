import { NextResponse } from "next/server";

// GET /api/v4/shopee/search?q=...&limit=20 — SERVER-ONLY, usa SHOPEE_APP_ID/SECRET.
// O import dinâmico garante que lib/shopee (com secrets) nunca vá para o cliente.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Number(searchParams.get("limit") || "20");
    if (!q) return NextResponse.json({ error: "Informe ?q=termo." }, { status: 400 });
    const { buscarShopee } = await import("@/lib/shopee");
    const itens = await buscarShopee(q, limit);
    return NextResponse.json({ marketplace: "shopee", total: itens.length, itens });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha na busca Shopee.";
    const status = /não configurada/i.test(msg) ? 428 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
