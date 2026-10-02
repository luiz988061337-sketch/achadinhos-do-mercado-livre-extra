import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/v4/site/buscar?q=... — busca pública nos produtos VISÍVEIS:
// V4 aprovados (products) + legados ativos (produtos). Para a página /comparar.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ itens: [] });
  const supabase = await createClient();

  const [v4, leg] = await Promise.all([
    supabase.from("products").select("id,title,price,image").eq("status", "approved").ilike("title", `%${q}%`).limit(10),
    supabase.from("produtos").select("id,nome,preco,imagem").eq("ativo", true).ilike("nome", `%${q}%`).limit(10),
  ]);

  const itens = [
    ...((v4.data ?? []).map((p: { id: string; title: string; price: number; image: string }) => ({
      id: `v4:${p.id}`, titulo: p.title, preco: Number(p.price), imagem: p.image, fonte: "v4" as const,
    }))),
    ...((leg.data ?? []).map((p: { id: string; nome: string; preco: number; imagem: string }) => ({
      id: `leg:${p.id}`, titulo: p.nome, preco: Number(p.preco), imagem: p.imagem, fonte: "legado" as const,
    }))),
  ];
  return NextResponse.json({ itens });
}
