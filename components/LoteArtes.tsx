  "use client";

import { useState } from "react";
import { MODELOS, drawCreative, validarParaArte, type ModeloId } from "@/lib/criativos";
import { gerarTextos } from "@/lib/textos-anuncio";
import { CANAIS } from "@/lib/canais";
import { createClient } from "@/lib/supabase/client";
import type { Produto } from "@/lib/types";

type Arte = {
  produto: Produto;
  modelo: ModeloId;
  dataUrl: string;
  anuncioId: string;
  link: string;
  avisoDb: string;
};

// 🖼️ Lote de 5 artes quadradas: seleciona 5, distribui modelos A/B/C,
// mostra resultado com download individual + ZIP + gerar novamente.
export default function LoteArtes({ produtos }: { produtos: Produto[] }) {
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [campanha, setCampanha] = useState<string>("ACHADINHOS_INSTAGRAM");
  const [rodada, setRodada] = useState(0);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [artes, setArtes] = useState<Arte[]>([]);

  const avaliados = produtos.map((p) => ({ p, problemas: validarParaArte(p) }));

  function alternar(id: string, bloqueado: boolean) {
    if (bloqueado) return;
    setSelecionados((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 5) return s;
      return [...s, id];
    });
  }

  async function gerar(novaRodada: number) {
    setErro("");
    setInfo("");
    if (selecionados.length !== 5) {
      setErro("Selecione exatamente 5 produtos.");
      return;
    }
    setGerando(true);
    setArtes([]);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const out: Arte[] = [];
      for (let i = 0; i < selecionados.length; i++) {
        const produto = produtos.find((p) => p.id === selecionados[i])!;
        const problemas = validarParaArte(produto);
        if (problemas.length > 0) throw new Error(`${produto.nome}: ${problemas.join(", ")}.`);
        const modelo = MODELOS[(i + novaRodada) % MODELOS.length].id as ModeloId;
        const canvas = document.createElement("canvas");
        await drawCreative(canvas, produto, modelo, "feed");
        // Dá respiro para a interface não travar.
        await new Promise((r) => setTimeout(r, 30));
        const dataUrl = canvas.toDataURL("image/png");

        // Histórico (não bloqueia o download se o banco ainda não migrou).
        let anuncioId = "";
        let avisoDb = "";
        const { data, error } = await supabase.from("anuncios").insert({
          produto_id: produto.id,
          formato: "feed",
          modelo,
          campanha,
          texto: gerarTextos(produto)[2]?.texto ?? null,
          admin_user_id: user?.id ?? null
        }).select("id").single();
        if (error) {
          avisoDb = "Histórico não salvo (execute a migração do banco).";
        } else {
          anuncioId = data.id;
        }
        const link = `${base}/sair/${produto.id}?origem=${encodeURIComponent(campanha)}${anuncioId ? `&anuncio=${anuncioId}` : ""}`;
        out.push({ produto, modelo, dataUrl, anuncioId, link, avisoDb });
      }
      setArtes(out);
      setInfo("5 artes geradas. Baixe uma a uma ou todas em ZIP.");
    } catch (e: any) {
      setErro(e?.message ?? "Falha ao gerar as artes.");
    } finally {
      setGerando(false);
    }
  }

  function baixar(dataUrl: string, nome: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = nome;
    a.click();
  }

  async function baixarTodas() {
    if (artes.length !== 5) return;
    setErro("");
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      artes.forEach((a, i) => {
        const b64 = a.dataUrl.split(",")[1];
        zip.file(`achadinhobr-produto-${String(i + 1).padStart(2, "0")}.png`, b64, { base64: true });
      });
      const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "achadinhobr-5-artes.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e: any) {
      setErro(`Falha ao gerar o ZIP: ${e?.message ?? e}`);
    }
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setInfo("Link copiado!");
      setTimeout(() => setInfo(""), 2000);
    } catch {
      setErro("Não foi possível copiar.");
    }
  }

  return <>
    <div className="field"><label htmlFor="lote-camp">Campanha / canal das 5 artes</label>
      <select id="lote-camp" value={campanha} onChange={(e) => setCampanha(e.target.value)}>
        {CANAIS.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
      </select></div>

    <h2>1️⃣ Selecione exatamente 5 produtos ({selecionados.length}/5)</h2>
    <div className="tableWrap"><table className="table"><thead><tr><th></th><th>Produto</th><th>Preço</th><th>Situação</th></tr></thead>
      <tbody>{avaliados.map(({ p, problemas }) => {
        const bloqueado = problemas.length > 0;
        const marcado = selecionados.includes(p.id);
        return <tr key={p.id}>
          <td><input type="checkbox" checked={marcado} disabled={bloqueado || (!marcado && selecionados.length >= 5)} onChange={() => alternar(p.id, bloqueado)} aria-label={`Selecionar ${p.nome}`} /></td>
          <td>{p.nome}</td>
          <td>R$ {Number(p.preco).toFixed(2).replace(".", ",")}</td>
          <td>{bloqueado ? `⛔ ${problemas.join(", ")}` : marcado ? "✅ selecionado" : "ok"}</td>
        </tr>;
      })}</tbody></table></div>

    {erro && <div className="error">{erro}</div>}
    {info && <div className="successMsg">{info}</div>}
    <div className="actions">
      <button type="button" className="success" disabled={gerando || selecionados.length !== 5} onClick={() => gerar(rodada)}>
        {gerando ? "Gerando..." : "🖼️ Gerar 5 artes"}
      </button>
      {artes.length === 5 ? <>
        <button type="button" className="secondary" onClick={baixarTodas}>📦 Baixar todas (ZIP)</button>
        <button type="button" className="secondary" disabled={gerando} onClick={() => { const r = rodada + 1; setRodada(r); gerar(r); }}>🔄 Gerar novamente</button>
      </> : null}
    </div>

    {artes.length === 5 ? <>
      <h2>2️⃣ Resultado</h2>
      <div className="artesGrid">
        {artes.map((a, i) => <div key={a.produto.id} className="arteCard">
          <img src={a.dataUrl} alt={`Arte ${i + 1}: ${a.produto.nome}`} loading="lazy" />
          <p><strong>Arte {i + 1}</strong> — Modelo {a.modelo} · {a.produto.nome}</p>
          {a.avisoDb ? <p style={{ fontSize: 12 }}>⚠️ {a.avisoDb}</p> : null}
          <div className="actions">
            <button type="button" className="secondary" onClick={() => baixar(a.dataUrl, `achadinhobr-produto-${String(i + 1).padStart(2, "0")}.png`)}>📥 Baixar</button>
            <button type="button" className="secondary" onClick={() => copiar(a.link)}>🔗 Copiar link</button>
          </div>
        </div>)}
      </div>
    </> : null}
  </>;
}
