"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Achado = { id: string; titulo: string; preco: number; imagem: string; fonte: string; oferta_slug?: string | null };

// Seletor da comparação: busca no site, adiciona até 3 via ?ids= na URL.
export default function CompararSeletor({ selecionados }: { selecionados: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [achados, setAchados] = useState<Achado[]>([]);
  const [msg, setMsg] = useState("");

  async function buscar() {
    if (q.trim().length < 2) return;
    setMsg("Buscando…");
    const r = await fetch(`/api/v4/site/buscar?q=${encodeURIComponent(q.trim())}`);
    const j = await r.json();
    setAchados(j.itens || []);
    setMsg((j.itens || []).length === 0 ? "Nada encontrado." : "");
  }

  function alternar(id: string) {
    const tem = selecionados.includes(id);
    const prox = tem ? selecionados.filter((s) => s !== id) : [...selecionados, id].slice(0, 3);
    router.push(prox.length > 0 ? `/comparar?ids=${prox.join(",")}` : "/comparar");
  }

  return <div>
    <div className="sortBar" role="search" aria-label="Buscar para comparar">
      <div className="field"><label htmlFor="cmp-q">Buscar produto</label>
        <input id="cmp-q" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscar(); } }} placeholder="ex: air fryer" /></div>
      <div className="actions" style={{ marginTop: 0 }}><button className="secondary" onClick={buscar}>🔎 Buscar</button></div>
    </div>
    {msg ? <p className="notice">{msg}</p> : null}
    {achados.length > 0 ? <div className="products">{achados.map((a) => {
      const on = selecionados.includes(a.id);
      return <article key={a.id} className="card">
        <div className="cardImage"><img src={a.imagem} alt={a.titulo} loading="lazy" /></div>
        <div className="cardBody">
          <div className="cardTitle">{a.titulo}</div>
          <div className="price">R$ {Number(a.preco).toFixed(2)}</div>
          {a.oferta_slug ? <div style={{ fontSize: 12 }}>🔥 Tem oferta publicada</div> : null}
          <button className={on ? "danger" : "secondary"} onClick={() => alternar(a.id)} disabled={!on && selecionados.length >= 3}>
            {on ? "✖ Remover" : "➕ Comparar"}
          </button>
        </div>
      </article>;
    })}</div> : null}
  </div>;
}
