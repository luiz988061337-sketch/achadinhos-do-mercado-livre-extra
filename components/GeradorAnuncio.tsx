  "use client";

import { useEffect, useRef, useState } from "react";
import { FORMATOS, MODELOS, drawCreative, nomeArquivo, validarParaArte, type FormatoId, type ModeloId } from "@/lib/criativos";
import { gerarTextos } from "@/lib/textos-anuncio";
import { CANAIS } from "@/lib/canais";
import { createClient } from "@/lib/supabase/client";
import type { Produto } from "@/lib/types";

// 🪄 Gerador individual: produto + formato + modelo + campanha.
// Renderiza em canvas no navegador (rápido, sem API externa).
// Só usa dados reais do cadastro. Download PNG 1080px+ de alta.
export default function GeradorAnuncio({ produtos, produtoInicialId }: { produtos: Produto[]; produtoInicialId?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [produtoId, setProdutoId] = useState(produtoInicialId ?? produtos[0]?.id ?? "");
  const [formatoId, setFormatoId] = useState<FormatoId>("feed");
  const [modelo, setModelo] = useState<ModeloId>("A");
  const [campanha, setCampanha] = useState<string>("ACHADINHOS_INSTAGRAM");
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [anuncioId, setAnuncioId] = useState("");
  const [salvando, setSalvando] = useState(false);

  const produto = produtos.find((p) => p.id === produtoId);
  const textos = produto ? gerarTextos(produto) : [];

  useEffect(() => {
    setAnuncioId("");
    if (!produto || !canvasRef.current) return;
    const problemas = validarParaArte(produto);
    if (problemas.length > 0) {
      setErro(`Arte bloqueada — produto ${problemas.join(", ")}.`);
      return;
    }
    setErro("");
    drawCreative(canvasRef.current, produto, modelo, formatoId).catch((e: any) =>
      setErro(e?.message ?? "Falha ao renderizar a arte.")
    );
  }, [produto, produtoId, formatoId, modelo]);

  function linkSaida() {
    if (!produto) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const q = `?origem=${encodeURIComponent(campanha)}${anuncioId ? `&anuncio=${anuncioId}` : ""}`;
    return `${base}/sair/${produto.id}${q}`;
  }

  async function copiar(texto: string, msg = "Copiado!") {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setInfo(msg);
    setTimeout(() => setInfo(""), 2500);
  }

  function baixar() {
    const canvas = canvasRef.current;
    if (!canvas || !produto) return;
    canvas.toBlob((blob) => {
      if (!blob) { setErro("Falha ao gerar o arquivo."); return; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = nomeArquivo(produto.slug);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, "image/png");
  }

  async function compartilhar() {
    const canvas = canvasRef.current;
    if (!canvas || !produto) return;
    const nav = navigator as any;
    canvas.toBlob(async (blob) => {
      if (!blob) { setErro("Falha ao gerar o arquivo."); return; }
      const file = new File([blob], nomeArquivo(produto.slug), { type: "image/png" });
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: produto.nome, text: textos[0]?.texto ?? produto.nome });
        } catch { /* cancelado */ }
      } else {
        copiar(linkSaida(), "Compartilhamento nativo indisponível — link copiado!");
      }
    }, "image/png");
  }

  async function salvar() {
    if (!produto) return;
    setSalvando(true);
    setErro("");
    setInfo("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("anuncios").insert({
        produto_id: produto.id,
        formato: formatoId,
        modelo,
        campanha,
        texto: textos[0]?.texto ?? null,
        admin_user_id: user?.id ?? null
      }).select("id").single();
      if (error) throw new Error(error.message);
      setAnuncioId(data.id);
      setInfo("Salvo no histórico da Central de Anúncios.");
    } catch (e: any) {
      setErro(`Não foi possível salvar (execute a migração do banco): ${e?.message ?? e}`);
    } finally {
      setSalvando(false);
    }
  }

  return <div className="formGrid" style={{ gridTemplateColumns: "1fr 1fr" }}>
    <div>
      <div className="field"><label htmlFor="ga-prod">Produto</label>
        <select id="ga-prod" value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
          {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} — {p.ativo ? "ativo" : "inativo"}</option>)}
        </select></div>
      <div className="field"><label htmlFor="ga-form">Formato</label>
        <select id="ga-form" value={formatoId} onChange={(e) => setFormatoId(e.target.value as FormatoId)}>
          {FORMATOS.map((f) => <option key={f.id} value={f.id}>{f.rotulo}</option>)}
        </select></div>
      <div className="field"><label htmlFor="ga-camp">Campanha / canal</label>
        <select id="ga-camp" value={campanha} onChange={(e) => setCampanha(e.target.value)}>
          {CANAIS.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
        </select></div>
      <div className="field"><label>Modelo visual</label>
        <div className="actions" style={{ marginTop: 0 }} role="group" aria-label="Modelo visual">
          {MODELOS.map((m) => <button key={m.id} type="button" className={modelo === m.id ? "success" : "secondary"} onClick={() => setModelo(m.id)} title={m.desc}>Modelo {m.id}</button>)}
        </div>
        <small>{MODELOS.find((m) => m.id === modelo)?.nome} — {MODELOS.find((m) => m.id === modelo)?.desc}</small></div>
      {erro && <div className="error">{erro}</div>}
      {info && <div className="successMsg">{info}</div>}
      <div className="actions">
        <button type="button" className="success" onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "💾 Salvar no histórico"}</button>
        <button type="button" className="secondary" onClick={baixar}>📥 Baixar imagem</button>
        <button type="button" className="secondary" onClick={compartilhar}>📱 Compartilhar</button>
        <button type="button" className="secondary" onClick={() => copiar(linkSaida(), "Link copiado!")}>🔗 Copiar link</button>
      </div>
      {!anuncioId ? <p style={{ fontSize: 13 }}>Salve no histórico para gerar o link com medição do criativo.</p> : null}
    </div>
    <div>
      <div className="artePreview"><canvas ref={canvasRef} aria-label={`Prévia da arte do produto ${produto?.nome ?? ""}`} /></div>
      <h3>📝 Textos prontos (só dados reais)</h3>
      {textos.map((t) => <div key={t.id} className="field" style={{ marginBottom: 12 }}>
        <label>{t.rotulo}</label>
        <textarea readOnly value={t.texto} rows={5} />
        <div className="actions" style={{ marginTop: 8 }}><button type="button" className="secondary" onClick={() => copiar(t.texto, "Texto copiado!")}>📋 Copiar texto</button></div>
      </div>)}
    </div>
  </div>;
}
