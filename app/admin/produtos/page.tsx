import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ProdutosAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.from("produtos").select("*").order("created_at", { ascending: false });

  return <><div className="sectionHeader"><h1>📦 Produtos</h1><Link href="/admin/produtos/novo" className="cta">➕ Novo produto</Link></div><div className="tableWrap"><table className="table"><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Status</th><th></th></tr></thead><tbody>{(data ?? []).map(p=><tr key={p.id}><td>{p.nome}</td><td>{p.categoria}</td><td>R$ {Number(p.preco).toFixed(2).replace(".",",")}</td><td>{p.ativo ? "Ativo" : "Inativo"}</td><td><Link href={`/admin/produtos/${p.id}`}>Editar</Link></td></tr>)}</tbody></table></div></>;
}