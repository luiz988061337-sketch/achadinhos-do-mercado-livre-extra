"use client";

import { useState } from "react";
import type { PublicacaoIA } from "@/lib/v3-ia";

// Botão "🤖 GERAR PUBLICAÇÃO" (item 15 da spec): gera os 5 textos com dados
// reais e opcionalmente salva rascunhos em social_posts.
export default function BotaoGerarPublicacao({ offerId }: { offerId: string }) {
  const [textos, setTextos] = useState<PublicacaoIA | null>(null);
  const [alertas, setAlertas] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function gerar(salvar: boolean) {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/v3/ia/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer_id: offerId, salvar }),
      });
      const j = await r.json();
      if (j.ok) {
        setTextos(j.textos);
        setAlertas(j.alertas ?? []);
        setMsg(salvar ? `Salvo ✅ (${j.salvos} rascunhos em Conteúdo)` : "Gerado ✅ (não salvo)");
      } else {
        setMsg(j.error || "Falhou");
      }
    } catch {
      setMsg("Erro de rede.");
    }
    setBusy(false);
  }

  async function copiar(t: string) {
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  const blocos: { rotulo: string; chave: keyof PublicacaoIA }[] = [
    { rotulo: "Título", chave: "titulo" },
    { rotulo: "Descrição curta", chave: "descricao" },
    { rotulo: "Texto WhatsApp", chave: "whatsapp" },
    { rotulo: "Legenda Instagram", chave: "instagram" },
    { rotulo: "Legenda TikTok", chave: "tiktok" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 640 }}>
      <span style={{ display: "flex", gap: 8 }}>
        <button type="button" disabled={busy} onClick={() => gerar(false)}>
          🤖 GERAR PUBLICAÇÃO
        </button>
        <button type="button" className="secondary" disabled={busy || !textos} onClick={() => gerar(true)}>
          💾 Salvar rascunhos
        </button>
      </span>
      {msg ? <p style={{ fontSize: 13 }}>{msg}</p> : null}
      {alertas.length > 0 && (
        <div className="notice">
          {alertas.map((a) => (
            <div key={a}>⚠️ {a}</div>
          ))}
        </div>
      )}
      {textos &&
        blocos.map((b) => (
          <div key={b.chave} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
            <strong style={{ fontSize: 13 }}>{b.rotulo}</strong>
            <p style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{textos[b.chave]}</p>
            <button type="button" className="secondary" onClick={() => copiar(textos[b.chave])}>
              📋 Copiar
            </button>
          </div>
        ))}
    </div>
  );
}
