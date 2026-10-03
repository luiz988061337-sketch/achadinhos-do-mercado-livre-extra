"use client";

import Link from "next/link";
import { useState } from "react";
import type { V4Product } from "@/lib/v4-types";

// Lista pending com ações: publicar (preço + links oficiais), rejeitar, fila WhatsApp.
// Após publicar, oferece o atalho para criar a oferta V3 do produto aprovado.
export default function V4Pendentes({ iniciais }: { iniciais: V4Product[] }) {
  const [lista, setLista] = useState<V4Product[]>(iniciais);
  const [affs, setAffs] = useState<Record<string, string>>({});
  const [precos, setPrecos] = useState<Record<string, string>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [ultimoAprovado, setUltimoAprovado] = useState<{ id: string; titulo: string } | null>(null);

  async function acao(id: string, action: "approve" | "reject" | "queue") {
    setMsg("");
    setUltimoAprovado(null);
    const affiliate_url = (affs[id] || "").trim() || undefined;
    const price = precos[id] !== undefined && precos[id] !== "" ? Number(precos[id]) : undefined;
    const url = (urls[id] || "").trim() || undefined;
    const alvo = lista.find((p) => p.id === id);
    const r = await fetch("/api/v4/products/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, affiliate_url, price, url }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error || "Falha na ação.");
      return;
    }
    setLista((l) => l.filter((p) => p.id !== id));
    if (action === "reject") {
      setMsg("Rejeitado.");
    } else {
      setMsg(action === "queue" ? "Publicado + fila WhatsApp. ✅" : "Publicado. ✅");
      if (alvo) setUltimoAprovado({ id: alvo.id, titulo: alvo.title });
    }
  }

  if (lista.length === 0) return <p className="notice">{msg || "Nada pendente. 🎉"}{msg ? ` ${msg}` : ""}{ultimoAprovado ? <> <Link href={`/admin/ofertas/nova?product_id=${ultimoAprovado.id}`}>🏷️ Criar oferta V3</Link></> : null}</p>;

  return <div>
    {msg ? <p className="notice">{msg}{ultimoAprovado ? <> <Link href={`/admin/ofertas/nova?product_id=${ultimoAprovado.id}`}>🏷️ Criar oferta V3 de “{ultimoAprovado.titulo.slice(0, 60)}”</Link></> : null}</p> : null}
    <div className="tableWrap"><table className="table">
      <thead><tr><th>Foto</th><th>Oferta</th><th>Loja</th><th>Score</th><th>Preço R$</th><th>Link oferta</th><th>Affiliate oficial</th><th>Ações</th></tr></thead>
      <tbody>
        {lista.map((p) => <tr key={p.id}>
          <td><img src={p.image} alt={p.title} width={64} height={64} style={{ objectFit: "cover", borderRadius: 8 }} loading="lazy" /></td>
          <td><strong>{p.title}</strong><br /><span style={{ fontSize: 12 }}>{p.external_id}{p.url ? <> · <a href={p.url} target="_blank" rel="noreferrer">origem</a></> : <> · <a href={`https://www.mercadolivre.com.br/p/${p.external_id}`} target="_blank" rel="noreferrer">📄 produto</a></>} · <a href={`https://www.google.com/search?q=${encodeURIComponent(`site:mercadolivre.com.br ${p.title}`)}`} target="_blank" rel="noreferrer">Google</a></span></td>
          <td>{p.marketplace}</td>
          <td>⭐ {p.score}</td>
          <td><input style={{ width: 90 }} inputMode="decimal" placeholder={Number(p.price) > 0 ? String(p.price) : "0,00"} value={precos[p.id] ?? ""} onChange={(e) => setPrecos((a) => ({ ...a, [p.id]: e.target.value }))} /></td>
          <td><input style={{ minWidth: 180 }} placeholder="https:// link da oferta…" value={urls[p.id] ?? (p.url || "")} onChange={(e) => setUrls((a) => ({ ...a, [p.id]: e.target.value }))} /></td>
          <td><input style={{ minWidth: 180 }} placeholder="https:// link oficial…" value={affs[p.id] || p.affiliate_url || ""} onChange={(e) => setAffs((a) => ({ ...a, [p.id]: e.target.value }))} /></td>
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
