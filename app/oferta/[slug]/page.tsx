import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resumoPrecos } from "@/lib/v3-score";
import { ROTULO_NIVEL, type ScoreLevel } from "@/lib/v3-types";
import BlocoPrecos from "@/components/BlocoPrecos";
import ShareButtons from "@/components/ShareButtons";
import RegistradorView from "@/components/RegistradorView";

function brl(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function buscarOferta(slug: string) {
  const supabase = await createClient();
  const { data: offer } = await supabase
    .from("offers")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!offer) return null;
  if (offer.expires_at != null && new Date(offer.expires_at).getTime() < Date.now()) return null;
  const [{ data: product }, { data: hist }] = await Promise.all([
    supabase.from("products").select("*").eq("id", offer.product_id).single(),
    supabase
      .from("price_history")
      .select("price, recorded_at")
      .eq("product_id", offer.product_id)
      .order("recorded_at", { ascending: true })
      .limit(500),
  ]);
  if (!product) return null;
  const precos = resumoPrecos(
    (hist ?? []).map((h: { price: number; recorded_at: string }) => ({
      price: Number(h.price),
      recorded_at: h.recorded_at,
    }))
  );
  return { offer, product, precos };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const achado = await buscarOferta(slug);
  if (!achado) return { title: "Oferta não encontrada | AchadinhosBR" };
  const titulo = `${achado.product.title} por ${brl(achado.offer.current_price)}`;
  const descricao =
    `${achado.product.title} — ${brl(achado.offer.current_price)}` +
    (achado.offer.discount_percentage > 0 ? ` (${achado.offer.discount_percentage}% OFF)` : "") +
    ". Confira a oferta no AchadinhosBR.";
  const path = `/oferta/${achado.offer.slug}`;
  return {
    title: `${titulo} | AchadinhosBR`,
    description: descricao,
    alternates: { canonical: path },
    openGraph: {
      title: titulo,
      description: descricao,
      images: achado.product.image ? [{ url: achado.product.image }] : undefined,
    },
  };
}

// Página pública da oferta: detalhe + botão consciente "IR PARA A OFERTA"
// (o clique é registrado em /oferta/[slug]/ir antes de sair do site).
export default async function OfertaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ origem?: string; campaign?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const achado = await buscarOferta(slug);
  if (!achado) notFound();
  const { offer, product, precos } = achado;
  const temAntigo =
    offer.old_price != null && Number(offer.old_price) > Number(offer.current_price);
  const irHref =
    `/oferta/${offer.slug}/ir` +
    (sp.origem || sp.campaign
      ? `?${new URLSearchParams({
          ...(sp.origem ? { origem: sp.origem } : {}),
          ...(sp.campaign ? { campaign: sp.campaign } : {}),
        }).toString()}`
      : "");

  return (
    <div className="container">
      <RegistradorView
        offerId={offer.id}
        tipo="offer_view"
        source={sp.origem}
        campaign={sp.campaign}
      />
      <p style={{ fontSize: 13 }}>
        <Link href="/ofertas">← Todas as ofertas</Link>
      </p>
      <h1>{product.title}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.image}
        alt={product.title}
        style={{ width: "100%", maxWidth: 560, borderRadius: 12 }}
      />
      <p>
        {temAntigo && (
          <>
            <s style={{ color: "#68717a" }}>{brl(offer.old_price)}</s>{" "}
          </>
        )}
        <strong style={{ fontSize: 28 }}>{brl(offer.current_price)}</strong>{" "}
        {offer.discount_percentage > 0 && <span>🏷️ {offer.discount_percentage}% OFF</span>}
      </p>
      {offer.coupon_code && (
        <p>
          🎟️ Cupom: <strong>{offer.coupon_code}</strong>
          {offer.coupon_value != null ? ` (${brl(offer.coupon_value)})` : ""}
        </p>
      )}
      {offer.shipping_price != null && (
        <p>🚚 Frete: {Number(offer.shipping_price) === 0 ? "grátis" : brl(offer.shipping_price)}</p>
      )}
      {Number(product.reviews) > 0 && (
        <p>
          ⭐ {product.rating} ({Number(product.reviews).toLocaleString("pt-BR")} avaliações)
          {product.sold ? ` · ${Number(product.sold).toLocaleString("pt-BR")} vendidos` : ""}
        </p>
      )}
      <p style={{ fontSize: 13 }}>
        📊 Score interno AchadinhosBR: <strong>{offer.score}/100</strong> —{" "}
        {ROTULO_NIVEL[offer.score_level as ScoreLevel]} (métrica interna, não é garantia de menor preço)
      </p>

      <p>
        <a className="cta" href={irHref} rel="nofollow sponsored noopener">
          IR PARA A OFERTA 👉
        </a>
      </p>
      <p style={{ fontSize: 12, color: "#68717a" }}>
        Os preços e condições podem mudar no Mercado Livre. Ao clicar, você sai do AchadinhosBR para
        a oferta oficial. <Link href="/transparencia">Entenda os links de afiliado</Link>.
      </p>

      <h2>Histórico de preços</h2>
      <BlocoPrecos precos={precos} />

      <h2>Compartilhar</h2>
      <ShareButtons titulo={product.title} path={`/oferta/${offer.slug}`} />
    </div>
  );
}
