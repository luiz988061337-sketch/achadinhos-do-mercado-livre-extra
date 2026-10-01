  "use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { categorias } from "@/lib/categorias";
import { validarLinkAfiliado, extrairMlId } from "@/lib/afiliado";
import { createClient } from "@/lib/supabase/client";
import { Produto } from "@/lib/types";

function isoParaData(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export default function ProdutoForm({ produto }: { produto?: Produto }) {
  const router = useRouter();
  const [form,setForm] = useState<any>({
    nome: produto?.nome ?? "", slug: produto?.slug ?? "",
    descricao: produto?.descricao ?? "", imagem: produto?.imagem ?? "",
    preco: produto?.preco ?? "", preco_antigo: produto?.preco_antigo ?? "",
    desconto: produto?.desconto ?? "", categoria: produto?.categoria ?? categorias[0].nome,
    categoria_slug: produto?.categoria_slug ?? categorias[0].slug,
    avaliacao: produto?.avaliacao ?? 5, avaliacoes: produto?.avaliacoes ?? 0,
    prioridade: produto?.prioridade ?? 0,
    link_produto: produto?.link_produto ?? "", link_afiliado: produto?.link_afiliado ?? "",
    ml_product_id: produto?.ml_product_id ?? "",
    verificado_em: isoParaData(produto?.verificado_em),
    destaque: produto?.destaque ?? false,
    ativo: produto?.ativo ?? true
  });
  const [msg,setMsg]=useState(""); const [erro,setErro]=useState("");
  const [linkColado,setLinkColado]=useState(""); const [linkInfo,setLinkInfo]=useState("");

  function change(key:string,value:any){setForm((f:any)=>({...f,[key]:value}));}

  // FASE 7 — importação assistida: valida o link colado e pré-preenche.
  // Não inventa dados: só valida e extrai o ID do anúncio (MLB...).
  function importarLink(){
    setLinkInfo(""); setErro("");
    const v = validarLinkAfiliado(linkColado);
    if (!v.ok) { setLinkInfo(""); setErro(v.motivo ?? "Link inválido."); return; }
    change("link_afiliado", linkColado.trim());
    const mlb = extrairMlId(linkColado);
    if (mlb) change("ml_product_id", mlb);
    setLinkInfo(v.aviso ?? `Link válido.${mlb ? ` ID do anúncio: ${mlb}.` : ""} Confira os demais campos e salve.`);
  }

  async function salvar(e:any){
    e.preventDefault(); setMsg(""); setErro("");

    if (!form.nome.trim() || !form.slug.trim() || !form.imagem.trim()) {
      setErro("Preencha nome, slug e imagem."); return;
    }
    const preco = Number(form.preco);
    if (!preco || preco <= 0) { setErro("Informe um preço atual válido."); return; }

    const link = (form.link_afiliado || "").trim();
    if (form.ativo && !link) {
      setErro("Para publicar (ativo), informe o link de afiliado específico da oferta."); return;
    }
    if (link) {
      const v = validarLinkAfiliado(link);
      if (!v.ok) { setErro(v.motivo ?? "Link de afiliado inválido."); return; }
    }

    const mudouPreco = produto ? Number(produto.preco) !== preco : true;
    const supabase=createClient();
    const payload={
      nome: form.nome.trim(), slug: form.slug.trim(),
      descricao: form.descricao.trim() || null, imagem: form.imagem.trim(),
      preco, preco_antigo: form.preco_antigo ? Number(form.preco_antigo) : null,
      desconto: form.desconto ? Number(form.desconto) : null,
      categoria: form.categoria, categoria_slug: form.categoria_slug,
      avaliacao: Number(form.avaliacao), avaliacoes: Number(form.avaliacoes),
      link_produto: form.link_produto.trim() || null,
      link_afiliado: link || null,
      ml_product_id: form.ml_product_id.trim() || extrairMlId(link),
      verificado_em: form.verificado_em ? new Date(`${form.verificado_em}T12:00:00`).toISOString() : new Date().toISOString(),
      prioridade: Number(form.prioridade) || 0,
      preco_atualizado_em: mudouPreco ? new Date().toISOString() : (produto?.preco_atualizado_em ?? new Date().toISOString()),
      destaque: !!form.destaque, ativo: !!form.ativo
    };
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

  return <>
    <div className="form" style={{marginBottom:15}}>
      <h2 style={{marginTop:0}}>🔗 Importação assistida</h2>
      <p style={{fontSize:13}}>Cole o link da oferta (obtido na Central de Afiliados). O sistema valida e pré-preenche — você confere e salva.</p>
      <div className="formGrid">
        <div className="field full"><label>Link do produto/oferta</label><input value={linkColado} onChange={e=>setLinkColado(e.target.value)} placeholder="https://www.mercadolivre.com.br/..." /></div>
      </div>
      <div className="actions"><button className="secondary" type="button" onClick={importarLink}>Validar e preencher</button></div>
      {linkInfo && <div className="successMsg">{linkInfo}</div>}
    </div>

    <form className="form" onSubmit={salvar}>
      {erro && <div className="error">{erro}</div>}{msg && <div className="successMsg">{msg}</div>}
      {produto && <div className="notice">Última atualização de preço: {produto.preco_atualizado_em ? new Date(produto.preco_atualizado_em).toLocaleString("pt-BR") : "—"}{produto.verificado_em ? ` · Verificado em: ${new Date(produto.verificado_em).toLocaleDateString("pt-BR")}` : ""}</div>}
      <div className="formGrid">
        <div className="field full"><label>Nome</label><input value={form.nome} onChange={e=>change("nome",e.target.value)} required /></div>
        <div className="field"><label>Slug</label><input value={form.slug} onChange={e=>change("slug",e.target.value)} required /></div>
        <div className="field"><label>Categoria</label><select value={form.categoria_slug} onChange={e=>{const c=categorias.find(x=>x.slug===e.target.value)!;change("categoria_slug",c.slug);change("categoria",c.nome)}}>{categorias.map(c=><option key={c.slug} value={c.slug}>{c.nome}</option>)}</select></div>
        <div className="field full"><label>Descrição</label><textarea value={form.descricao} onChange={e=>change("descricao",e.target.value)} placeholder="Descrição curta e honesta do produto" /></div>
        <div className="field full"><label>URL da imagem</label><input value={form.imagem} onChange={e=>change("imagem",e.target.value)} required /></div>
        <div className="field"><label>Preço</label><input type="number" step="0.01" min="0" value={form.preco} onChange={e=>change("preco",e.target.value)} required /></div>
        <div className="field"><label>Preço antigo</label><input type="number" step="0.01" min="0" value={form.preco_antigo} onChange={e=>change("preco_antigo",e.target.value)} /></div>
        <div className="field"><label>Desconto (%)</label><input type="number" min="0" max="99" value={form.desconto} onChange={e=>change("desconto",e.target.value)} /></div>
        <div className="field"><label>Data de verificação</label><input type="date" value={form.verificado_em} onChange={e=>change("verificado_em",e.target.value)} /></div>
        <div className="field"><label>Avaliação</label><input type="number" min="0" max="5" step="0.1" value={form.avaliacao} onChange={e=>change("avaliacao",e.target.value)} /></div>
        <div className="field"><label>Nº avaliações</label><input type="number" min="0" value={form.avaliacoes} onChange={e=>change("avaliacoes",e.target.value)} /></div>
        <div className="field full"><label>Link de afiliado (específico da oferta)</label><input type="url" value={form.link_afiliado} onChange={e=>change("link_afiliado",e.target.value)} placeholder="https://www.mercadolivre.com.br/..." /></div>
        <div className="field"><label>Link do produto (opcional)</label><input type="url" value={form.link_produto} onChange={e=>change("link_produto",e.target.value)} /></div>
        <div className="field"><label>ID do anúncio ML (ex.: MLB123)</label><input value={form.ml_product_id} onChange={e=>change("ml_product_id",e.target.value)} /></div>
        <div className="field"><label><input type="checkbox" checked={form.destaque} onChange={e=>change("destaque",e.target.checked)} /> Destaque</label></div>
        <div className="field"><label>Prioridade (ordem)</label><input type="number" value={form.prioridade} onChange={e=>change("prioridade",e.target.value)} /></div>
        <div className="field"><label><input type="checkbox" checked={form.ativo} onChange={e=>change("ativo",e.target.checked)} /> Ativo (publica no site)</label></div>
      </div>
      <div className="actions"><button className="success" type="submit">Salvar produto</button>{produto && <button className="danger" type="button" onClick={excluir}>Excluir</button>}</div>
    </form>
  </>;
}
