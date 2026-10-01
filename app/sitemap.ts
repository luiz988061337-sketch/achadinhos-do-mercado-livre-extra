import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { categorias } from "@/lib/categorias";

const BASE = "https://achadinhos-nine.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas = ["", "/ofertas", "/sobre", "/como-funciona", "/afiliados", "/contato", "/privacidade", "/termos"]
    .map((r) => ({ url: `${BASE}${r || "/"}`, lastModified: new Date() }));
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("produtos").select("slug, preco_atualizado_em").eq("ativo", true).limit(1000);
    const produtos = (data ?? []).map((p: any) => ({
      url: `${BASE}/produto/${p.slug}`,
      lastModified: p.preco_atualizado_em ? new Date(p.preco_atualizado_em) : new Date()
    }));
    const cats = categorias.map((c) => ({ url: `${BASE}/categoria/${c.slug}`, lastModified: new Date() }));
    return [...estaticas, ...cats, ...produtos];
  } catch {
    return estaticas;
  }
}
