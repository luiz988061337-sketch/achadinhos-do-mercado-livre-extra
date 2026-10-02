"use client";

import { useState } from "react";
import type { V4Product } from "@/lib/v4-types";

// Lista pending com ações: publicar (exige affiliate oficial), rejeitar, fila WhatsApp.
export default function V4Pendentes({ iniciais }: { iniciais: V4Product[] }) {
  const [lista, setLista] = useState<V4Product[]>(iniciais);
  const [affs, setAffs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  async function acao(id: string, action: "approve" | "reject" | "queue") {
    setMsg("");
    const affiliate_url = (affs[id] || "").trim() || undefined;
    const r = await fetch("/api/v4/products/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, affiliate_url }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error || "Falha na ação.");
      return;
    }
    setLista((l) => l.filter((p) => p.id !== id));
    setMsg(action === "reject" ? "Rejeitado." : action === "queue" ? "Publicado + fila WhatsApp. ✅" : "Publicado. ✅");
  }

  if (lista.length === 0) return <p className="notice">{msg || "Nada pendente. 🎉"}{msg ? ` ${msg}` : ""}</p>;

  return <div>
    {msg ? <p className="notice">{msg}</p> : null}
    <div className="tableWrap"><table className="table">
      <thead><tr><th>Oferta</th><th>Loja</th><th>Score</th><th>Preço</th><th>Affiliate oficial</th><th>Ações</th></tr></thead>
      <tbody>
        {lista.map((p) => <tr key={p.id}>
          <td><strong>{p.title}</strong><br /><span style={{ fontSize: 12 }}><a href={p.url} target="_blank" rel="noreferrer">origem</a> · {p.external_id}</span></td>
          <td>{p.marketplace}</td>
          <td>⭐ {p.score}</td>
          <td>R$ {Number(p.price).toFixed(2)}</td>
          <td><input style={{ minWidth: 220 }} placeholder="https:// link oficial…" value={affs[p.id] || p.affiliate_url || ""} onChange={(e) => setAffs((a) => ({ ...a, [p.id]: e.target.value }))} /></td>
          <td>
            <div className="actions">
              <button onClick={() => acao(p.id, "approve")}>Publicar</button>
              <button className="secondary" onClick={() => acao(p.id, "queue")}>Fila WA</button>
              <button className="danger" onClick={() => acao(p.id, "reject")}>Rejeitar</button>
            </div>
          </td>
        </tr>)}
      </tbody></table></div>
  </div>;
}
