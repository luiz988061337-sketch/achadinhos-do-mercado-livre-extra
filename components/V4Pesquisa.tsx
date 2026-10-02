"use client";

import { useState } from "react";

type Item = {
  external_id: string;
  title: string;
  image: string;
  price: number;
  old_price: number | null;
  url: string;
  affiliate_url?: string | null;
  [k: string]: unknown;
};

// Tela de pesquisa V4: busca ML (API oficial) e Shopee (Open API server-only),
// mostra resultados e importa tudo como pending (nunca publica sozinho).
export default function V4Pesquisa() {
  const [termo, setTermo] = useState("");
  const [mp, setMp] = useState<"mercadolivre" | "shopee">("mercadolivre");
  const [itens, setItens] = useState<Item[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  // Marketplace → segmento da rota: mercadolivre→ml, shopee→shopee.
  const rota = mp === "mercadolivre" ? "ml" : "shopee";

  async function buscar() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(`/api/v4/${rota}/search?q=${encodeURIComponent(termo)}&limit=20`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha na busca.");
      setItens(j.itens || []);
      setMsg(`${j.total ?? 0} encontrados (${j.marketplace}). Confira e importe como pending.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha na busca.");
    } finally {
      setBusy(false);
    }
  }

  async function importar() {
    if (itens.length === 0) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/v4/${rota}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha ao importar.");
      setMsg(`Importados: ${j.inseridos} como PENDING. Pulados: ${(j.pulados || []).length}.`);
      setItens([]);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao importar.");
    } finally {
      setBusy(false);
    }
  }

  return <div>
    <div className="sortBar">
      <div className="field"><label htmlFor="v4-mp">Marketplace</label>
        <select id="v4-mp" value={mp} onChange={(e) => setMp(e.target.value as "mercadolivre" | "shopee")}>
          <option value="mercadolivre">Mercado Livre (API oficial)</option>
          <option value="shopee">Shopee (Affiliate Open API)</option>
        </select></div>
      <div className="field"><label htmlFor="v4-q">Buscar</label>
        <input id="v4-q" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="ex: air fryer 5l" /></div>
      <div className="actions" style={{ marginTop: 0 }}>
        <button className="secondary" onClick={buscar} disabled={busy || !termo.trim()}>{busy ? "…" : "🔎 Buscar"}</button>
        {itens.length > 0 ? <button onClick={importar} disabled={busy}>📥 Importar {itens.length} como pending</button> : null}
      </div>
    </div>
    {msg ? <p className="notice">{msg}</p> : null}
    {mp === "mercadolivre" ? <p className="notice">ML (catálogo oficial): confira a <strong>disponibilidade na página do produto</strong> antes de importar — rejeite os sem oferta ativa. Preço e links vão na aprovação.</p> : null}
    <div className="products">
      {itens.map((it) => <article key={it.external_id} className="card">
        <div className="cardImage"><img src={it.image} alt={it.title} loading="lazy" /></div>
        <div className="cardBody">
          <div className="cardTitle">{it.title}</div>
          <div className="price">{Number(it.price) > 0 ? `R$ ${Number(it.price).toFixed(2)}` : "💰 preço na aprovação"}</div>
          <div style={{ fontSize: 12 }}>{it.external_id}{it.url ? <> · <a href={it.url} target="_blank" rel="noreferrer">ver origem</a></> : " · catálogo"}</div>
        </div>
      </article>)}
    </div>
  </div>;
}
