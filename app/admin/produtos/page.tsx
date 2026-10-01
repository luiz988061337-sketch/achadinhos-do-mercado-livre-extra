import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { validarLinkAfiliado } from "@/lib/afiliado";

export default async function ProdutosAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.from("produtos").select("*").order("created_at", { ascending: false });

  return <><div className="sectionHeader"><h1>📦 Produtos</h1><Link href="/admin/produtos/novo" className="cta">➕ Novo produto</Link></div><div className="tableWrap"><table className="table"><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Desconto</th><th>Link afiliado</th><th>Status</th><th>Atualizado em</th><th></th></tr></thead><tbody>{(data ?? []).map((p: any) => {
    const link = validarLinkAfiliado(p.link_afiliado ?? "");
    return <tr key={p.id}><td>{p.nome}{p.destaque ? " ⭐" : ""}</td><td>{p.categoria}</td><td>R$ {Number(p.preco).toFixed(2).replace(".", ",")}</td><td>{p.desconto ? `${p.desconto}%` : "—"}</td><td>{!p.link_afiliado ? "sem link" : link.ok ? "✅ válido" : `❌ ${link.motivo}`}</td><td>{p.ativo ? "Ativo" : "Inativo"}</td><td>{p.preco_atualizado_em ? new Date(p.preco_atualizado_em).toLocaleDateString("pt-BR") : "—"}</td><td><Link href={`/admin/produtos/${p.id}`}>Editar</Link> · <Link href={`/admin/anuncios/novo?produto=${p.id}`}>🪄 Anúncio</Link></td></tr>;
  })}</tbody></table></div></>;
}