import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { categorias } from "@/lib/categorias";

const BASE = "https://achadinhos-nine.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas = ["", "/ofertas", "/sobre", "/como-funciona", "/afiliados", "/contato", "/privacidade", "/termos", "/transparencia"]
    .map((r) => ({ url: `${BASE}${r || "/"}`, lastModified: new Date() }));
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("produtos").select("slug, preco_atualizado_em").eq("ativo", true).limit(1000);
    const produtos = (data ?? []).map((p: any) => ({
      url: `${BASE}/produto/${p.slug}`,
      lastModified: p.preco_atualizado_em ? new Date(p.preco_atualizado_em) : new Date()
    }));
    const cats = categorias.map((c) => ({ url: `${BASE}/categoria/${c.slug}`, lastModified: new Date() }));
    // V3: ofertas publicadas e não expiradas (só com slug) — aditivo, não remove nada.
    // Blindagem dupla: filtra no SQL e de novo no JS (cron pode ainda não ter expirado).
    let ofertas: { url: string; lastModified: Date }[] = [];
    try {
      const agora = new Date();
      const { data: ofs } = await supabase.from("offers").select("slug, updated_at, expires_at").eq("status", "published").or("expires_at.is.null,expires_at.gt." + agora.toISOString()).limit(1000);
      ofertas = ((ofs ?? []) as { slug: string | null; updated_at: string; expires_at: string | null }[])
        .filter((o) => o.slug && (o.expires_at == null || new Date(o.expires_at).getTime() > agora.getTime()))
        .map((o) => ({ url: `${BASE}/oferta/${o.slug}`, lastModified: new Date(o.updated_at) }));
    } catch {
      ofertas = [];
    }
    return [...estaticas, ...cats, ...produtos, ...ofertas];
  } catch {
    return estaticas;
  }
}
