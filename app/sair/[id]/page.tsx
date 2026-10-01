import { createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { normalizarOrigem } from "@/lib/canais";
import { brl } from "@/components/ProductCard";

// Etapa de saída (FASE 3): registra o clique e mostra claramente o destino.
// Não há redirecionamento automático: o usuário lê e escolhe continuar.
// O botão de continuar é um link direto, sem modificação e na mesma aba.
export default async function SairPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ origem?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: produto } = await supabase
    .from("produtos")
    .select("id, slug, nome, imagem, preco, preco_antigo, desconto, categoria, link_afiliado")
    .eq("id", id)
    .eq("ativo", true)
    .single();

  if (!produto?.link_afiliado) redirect("/ofertas");

  const heads = await headers();
  const jar = await cookies();
  const origem = normalizarOrigem(sp.origem);
  const forwarded = heads.get("x-forwarded-for");
  const ipLimpo = forwarded?.split(",")[0]?.trim() || null;

  await supabase.from("cliques").insert({
    produto_id: produto.id,
    pagina_origem: heads.get("referer"),
    origem,
    sessao_id: jar.get("ach_sid")?.value ?? null,
    user_agent: heads.get("user-agent"),
    ip: null,
    ip_hash: ipLimpo ? createHash("sha256").update(ipLimpo).digest("hex") : null
  });

  let destinoHost = "";
  try {
    destinoHost = new URL(produto.link_afiliado).hostname;
  } catch {
    destinoHost = "mercadolivre.com.br";
  }

  return <div className="container">
    <div className="auth">
      <div className="authBox" style={{ maxWidth: 560 }}>
        <div className="breadcrumb"><Link href="/">Início</Link> / <Link href={`/produto/${produto.slug}`}>{produto.nome}</Link> / Saída</div>
        <h1>🔗 Você está saindo do AchadinhosBR</h1>
        <p><strong>{produto.nome}</strong> — <strong>{brl(Number(produto.preco))}</strong></p>
        <div className="notice">
          Você será levado para concluir a compra em:<br />
          <strong>{destinoHost}</strong>
          <br />
          <span style={{ fontSize: 12, wordBreak: "break-all" }}>{produto.link_afiliado}</span>
        </div>
        <p style={{ fontSize: 13 }}>Este é um link de afiliado: podemos receber uma comissão se você comprar, sem custo extra para você. Preço e disponibilidade podem ter mudado.</p>
        <a className="bigBuy" style={{ animation: "none" }} href={produto.link_afiliado}>Continuar para o Mercado Livre</a>
        <div className="actions"><Link href={`/produto/${produto.slug}`} className="secondary" style={{ textDecoration: "none" }}>← Voltar ao produto</Link></div>
      </div>
    </div>
  </div>;
}
