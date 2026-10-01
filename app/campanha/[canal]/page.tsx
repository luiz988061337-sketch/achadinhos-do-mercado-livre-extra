import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { CANAIS } from "@/lib/canais";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ canal: string }> };

function acharCanal(canal: string) {
  const v = canal.toUpperCase();
  return CANAIS.find((c) => c.id === v || c.id === `ACHADINHOS_${v}`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { canal } = await params;
  const achou = acharCanal(canal);
  if (!achou) return { title: "Campanha não encontrada | AchadinhosBR" };
  return {
    title: `Ofertas para você (${achou.rotulo}) | AchadinhosBR`,
    description: `Seleção de ofertas do AchadinhosBR para quem veio pelo ${achou.rotulo}. Preços podem mudar no Mercado Livre.`,
    alternates: { canonical: "/ofertas" }
  };
}

export default async function Campanha({ params }: Props) {
  const { canal } = await params;
  const info = acharCanal(canal);
  if (!info) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("produtos").select("*").eq("ativo", true)
    .order("prioridade", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(24);
  const lista = data ?? [];

  return <div className="container">
    <div className="pageTitle">
      <div className="breadcrumb">Início / Campanhas / {info.rotulo}</div>
      <h1>🔥 Ofertas para você</h1>
      <p aria-live="polite">Seleção especial para quem chegou pelo {info.rotulo}. Ao clicar, você passa pela nossa página de saída e escolhe continuar para o Mercado Livre.</p>
    </div>
    <div className="products">{lista.map((p) => <ProductCard key={p.id} produto={p} origem={info.id} />)}</div>
    {lista.length === 0 && <div className="notice">Ainda não há ofertas ativas.</div>}
  </div>;
}
