import { createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizarOrigem } from "@/lib/canais";
import { limparRotulo } from "@/lib/v3-track";

// GET /oferta/[slug]/ir?origem=&campaign=&placement=&device=
// Registra o clique (offer_id + produto + origem + campanha) em public.clicks
// e redireciona para o affiliate_url OFICIAL. O usuário chega aqui pelo botão
// "IR PARA A OFERTA" — clique consciente, sem redirect automático invisível.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: offer } = await supabase
    .from("offers")
    .select("id, product_id, status, expires_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  const invalida =
    !offer || (offer.expires_at != null && new Date(offer.expires_at).getTime() < Date.now());
  if (invalida) return NextResponse.redirect(new URL("/ofertas", req.url));

  const { data: p } = await supabase
    .from("products")
    .select("id, affiliate_url, url, marketplace")
    .eq("id", offer.product_id)
    .single();
  const destino = (p?.affiliate_url || "").trim();
  // Publicada exige afiliado oficial (validado no PATCH); sem ele, não expõe link cru.
  if (!p || !destino.startsWith("https://")) {
    return NextResponse.redirect(new URL("/ofertas", req.url));
  }

  const heads = await headers();
  const jar = await cookies();
  let origem = "ACHADINHOS_SITE";
  let campaign: string | null = null;
  let placement: string | null = null;
  let device: string | null = null;
  try {
    const u = new URL(req.url);
    origem = normalizarOrigem(u.searchParams.get("origem"));
    campaign = limparRotulo(u.searchParams.get("campaign"));
    placement = limparRotulo(u.searchParams.get("placement"));
    device = limparRotulo(u.searchParams.get("device"));
  } catch {
    origem = "ACHADINHOS_SITE";
  }
  const forwarded = heads.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || null;

  await supabase.from("clicks").insert({
    product_id: p.id,
    offer_id: offer.id,
    marketplace: p.marketplace,
    referer: heads.get("referer"),
    user_agent: heads.get("user-agent"),
    origin: origem,
    campaign,
    placement,
    device,
    session_id: jar.get("ach_sid")?.value ?? null,
    ip_hash: ip ? createHash("sha256").update(ip).digest("hex") : null,
  });

  return NextResponse.redirect(destino);
}
