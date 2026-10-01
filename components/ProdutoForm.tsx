 "use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { categorias } from "@/lib/categorias";
import { createClient } from "@/lib/supabase/client";
import { Produto } from "@/lib/types";

export default function ProdutoForm({ produto }: { produto?: Produto }) {
  const router = useRouter();
  const [form,setForm] = useState<any>({
    nome: produto?.nome ?? "", slug: produto?.slug ?? "", imagem: produto?.imagem ?? "",
    preco: produto?.preco ?? "", preco_antigo: produto?.preco_antigo ?? "",
    desconto: produto?.desconto ?? "", categoria: produto?.categoria ?? categorias[0].nome,
    categoria_slug: produto?.categoria_slug ?? categorias[0].slug,
    avaliacao: produto?.avaliacao ?? 5, avaliacoes: produto?.avaliacoes ?? 0,
    destaque: produto?.destaque ?? false, link_afiliado: produto?.link_afiliado ?? "",
    ativo: produto?.ativo ?? true
  });
  const [msg,setMsg]=useState(""); const [erro,setErro]=useState("");

  function change(key:string,value:any){setForm((f:any)=>({...f,[key]:value}));}

  async function salvar(e:any){
    e.preventDefault(); setMsg(""); setErro("");
    const supabase=createClient();
    const payload={...form, preco:Number(form.preco), preco_antigo:form.preco_antigo?Number(form.preco_antigo):null, desconto:form.desconto?Number(form.desconto):null, avaliacao:Number(form.avaliacao), avaliacoes:Number(form.avaliacoes)};
    const result=produto
      ? await supabase.from("produtos").update(payload).eq("id",produto.id)
      : await supabase.from("produtos").insert(payload);
    if(result.error){setErro(result.error.message);return;}
    setMsg("Produto salvo com sucesso.");
    router.push("/admin/produtos"); router.refresh();
  }

  async function excluir(){
    if(!produto || !confirm("Excluir este produto?")) return;
    const supabase=createClient();
    const {error}=await supabase.from("produtos").delete().eq("id",produto.id);
    if(error){setErro(error.message);return;}
    router.push("/admin/produtos"); router.refresh();
  }

  return <form className="form" onSubmit={salvar}>
    {erro && <div className="error">{erro}</div>}{msg && <div className="successMsg">{msg}</div>}
    <div className="formGrid">
      <div className="field full"><label>Nome</label><input value={form.nome} onChange={e=>change("nome",e.target.value)} required /></div>
      <div className="field"><label>Slug</label><input value={form.slug} onChange={e=>change("slug",e.target.value)} required /></div>
      <div className="field"><label>Categoria</label><select value={form.categoria_slug} onChange={e=>{const c=categorias.find(x=>x.slug===e.target.value)!;change("categoria_slug",c.slug);change("categoria",c.nome)}}>{categorias.map(c=><option key={c.slug} value={c.slug}>{c.nome}</option>)}</select></div>
      <div className="field full"><label>URL da imagem</label><input value={form.imagem} onChange={e=>change("imagem",e.target.value)} required /></div>
      <div className="field"><label>Preço</label><input type="number" step="0.01" value={form.preco} onChange={e=>change("preco",e.target.value)} required /></div>
      <div className="field"><label>Preço antigo</label><input type="number" step="0.01" value={form.preco_antigo} onChange={e=>change("preco_antigo",e.target.value)} /></div>
      <div className="field"><label>Desconto (%)</label><input type="number" value={form.desconto} onChange={e=>change("desconto",e.target.value)} /></div>
      <div className="field"><label>Avaliação</label><input type="number" min="0" max="5" step="0.1" value={form.avaliacao} onChange={e=>change("avaliacao",e.target.value)} /></div>
      <div className="field"><label>Nº avaliações</label><input type="number" value={form.avaliacoes} onChange={e=>change("avaliacoes",e.target.value)} /></div>
      <div className="field full"><label>Link de afiliado</label><input type="url" value={form.link_afiliado} onChange={e=>change("link_afiliado",e.target.value)} required /></div>
      <div className="field"><label><input type="checkbox" checked={form.destaque} onChange={e=>change("destaque",e.target.checked)} /> Destaque</label></div>
      <div className="field"><label><input type="checkbox" checked={form.ativo} onChange={e=>change("ativo",e.target.checked)} /> Ativo</label></div>
    </div>
    <div className="actions"><button className="success" type="submit">Salvar produto</button>{produto && <button className="danger" type="button" onClick={excluir}>Excluir</button>}</div>
  </form>;
}