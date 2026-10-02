import { createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizarOrigem } from "@/lib/canais";

// GET /ver/[id]?origem=ACHADINHOS_WHATSAPP
// Rastreamento V4: registra em public.clicks (produto, marketplace, data/hora,
// referer, user-agent) e redireciona para o affiliate_url OFICIAL.
// Preserva /sair/[id] legado (tabela produtos/cliques) — esta rota é só V4.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("products")
    .select("id, affiliate_url, url, marketplace, status")
    .eq("id", id)
    .eq("status", "approved")
    .single();

  // Sem produto aprovado ou sem afiliado oficial → volta para ofertas (não expõe link cru).
  if (!p) return NextResponse.redirect(new URL("/ofertas", _req.url));

  const heads = await headers();
  const jar = await cookies();
  let origem = "ACHADINHOS_SITE";
  try {
    const u = new URL(_req.url);
    origem = normalizarOrigem(u.searchParams.get("origem"));
  } catch {
    origem = "ACHADINHOS_SITE";
  }
  const forwarded = heads.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || null;

  await supabase.from("clicks").insert({
    product_id: p.id,
    marketplace: p.marketplace,
    referer: heads.get("referer"),
    user_agent: heads.get("user-agent"),
    origin: origem,
    session_id: jar.get("ach_sid")?.value ?? null,
    ip_hash: ip ? createHash("sha256").update(ip).digest("hex") : null,
  });

  const destino = (p.affiliate_url || p.url || "").trim();
  if (!destino.startsWith("https://")) return NextResponse.redirect(new URL("/ofertas", _req.url));
  return NextResponse.redirect(destino);
}
