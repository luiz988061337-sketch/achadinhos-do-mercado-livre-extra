import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Compatibilidade: /go/[id] entende legado + V4 + V3.
// - V4 com oferta publicada → /oferta/[slug] (saída consciente)
// - V4 aprovado sem oferta → /ver/[id] (redirect direto ao afiliado)
// - senão → /sair/[id] legado (registra clique lá)
// Preserva ?origem= ?anuncio= e params de campanha.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const atual = new URL(request.url);
  const pass = ["origem", "anuncio", "campaign", "placement", "device"] as const;
  const supabase = await createClient();
  try {
    const { data: p } = await supabase.from("products").select("id").eq("id", id).eq("status", "approved").maybeSingle();
    if (p?.id) {
      const { data: offer } = await supabase
        .from("offers")
        .select("slug, expires_at")
        .eq("product_id", id)
        .eq("status", "published")
        .not("slug", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const slug = (offer as { slug: string | null; expires_at: string | null } | null)?.slug;
      const exp = (offer as { slug: string | null; expires_at: string | null } | null)?.expires_at;
      const valida = slug && (exp == null || new Date(exp).getTime() >= Date.now());
      const destino = new URL(valida ? `/oferta/${slug}` : `/ver/${id}`, request.url);
      for (const k of pass) {
        const v = atual.searchParams.get(k);
        if (v) destino.searchParams.set(k, v);
      }
      return NextResponse.redirect(destino, { status: 307 });
    }
  } catch {
    // cai no legado abaixo
  }
  const destino = new URL(`/sair/${id}`, request.url);
  const origem = atual.searchParams.get("origem");
  if (origem) destino.searchParams.set("origem", origem);
  const anuncio = atual.searchParams.get("anuncio");
  if (anuncio) destino.searchParams.set("anuncio", anuncio);
  return NextResponse.redirect(destino, { status: 307 });
}
