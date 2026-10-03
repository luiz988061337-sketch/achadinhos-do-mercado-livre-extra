import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/v4/site/buscar?q=... — busca pública nos produtos VISÍVEIS:
// V4 aprovados (products) + legados ativos (produtos). Para a página /comparar.
// V4 inclui oferta_slug quando há oferta publicada (para preferir /oferta).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ itens: [] });
  const supabase = await createClient();

  const [v4, leg] = await Promise.all([
    supabase.from("products").select("id,title,price,image").eq("status", "approved").ilike("title", `%${q}%`).limit(10),
    supabase.from("produtos").select("id,nome,preco,imagem").eq("ativo", true).ilike("nome", `%${q}%`).limit(10),
  ]);

  const idsV4 = ((v4.data ?? []) as { id: string }[]).map((p) => p.id);
  let slugPorProduto = new Map<string, string>();
  if (idsV4.length > 0) {
    try {
      const agora = Date.now();
      const { data: offers } = await supabase.from("offers").select("product_id, slug, expires_at").in("product_id", idsV4).eq("status", "published").not("slug", "is", null);
      for (const o of (offers ?? []) as { product_id: string; slug: string | null; expires_at: string | null }[]) {
        if (!o.slug || slugPorProduto.has(o.product_id)) continue;
        if (o.expires_at != null && new Date(o.expires_at).getTime() < agora) continue;
        slugPorProduto.set(o.product_id, o.slug);
      }
    } catch {
      slugPorProduto = new Map();
    }
  }

  const itens = [
    ...((v4.data ?? []).map((p: { id: string; title: string; price: number; image: string }) => ({
      id: `v4:${p.id}`, titulo: p.title, preco: Number(p.price), imagem: p.image, fonte: "v4" as const,
      oferta_slug: slugPorProduto.get(p.id) ?? null,
    }))),
    ...((leg.data ?? []).map((p: { id: string; nome: string; preco: number; imagem: string }) => ({
      id: `leg:${p.id}`, titulo: p.nome, preco: Number(p.preco), imagem: p.imagem, fonte: "legado" as const,
      oferta_slug: null as string | null,
    }))),
  ];
  return NextResponse.json({ itens });
}
