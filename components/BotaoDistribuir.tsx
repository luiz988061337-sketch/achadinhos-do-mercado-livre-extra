"use client";

import { useState } from "react";

// Distribuição manual/oficial por oferta (item 13 da spec).
// [COPIAR MENSAGEM]: cola onde o admin escolher (grupo, status, DM).
// [FILA OFICIAL]: enfileira na whatsapp_queue (Cloud API, 1:1).
// Nenhum disparo automático: tudo passa por decisão humana.
export default function BotaoDistribuir({
  productId,
  titulo,
  preco,
  precoAntigo,
  desconto,
  avaliacao,
  pathOferta,
}: {
  productId: string;
  titulo: string;
  preco: number;
  precoAntigo: number | null;
  desconto: number;
  avaliacao: string | null;
  pathOferta: string;
}) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiado, setCopiado] = useState(false);

  function montarMensagem(): string {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${base}${pathOferta}?origem=ACHADINHOS_WHATSAPP`;
    const de =
      precoAntigo != null && precoAntigo > preco
        ? `De: ${precoAntigo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}\n`
        : "";
    return (
      `🔥 ACHADINHO DO DIA\n\n${titulo}\n\n${de}` +
      `Por: ${preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}\n` +
      (desconto > 0 ? `\n🔥 ${desconto}% OFF\n` : "") +
      (avaliacao ? `\n⭐ ${avaliacao}\n` : "") +
      `\n👉 Confira a oferta:\n\n${link}`
    );
  }

  async function copiar() {
    const texto = montarMensagem();
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
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  }

  async function filaOficial() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/v4/whatsapp/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, message: montarMensagem() }),
      });
      const j = await r.json();
      setMsg(j.ok ? "Na fila oficial ✅" : j.error || "Falhou");
    } catch {
      setMsg("Erro de rede.");
    }
    setBusy(false);
  }

  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" className="secondary" onClick={copiar}>
        {copiado ? "✅ Copiado!" : "📋 COPIAR MENSAGEM"}
      </button>
      <button type="button" className="secondary" disabled={busy} onClick={filaOficial}>
        {busy ? "…" : "📤 Fila oficial"}
      </button>
      {msg ? <span style={{ fontSize: 12 }}> {msg}</span> : null}
    </span>
  );
}
