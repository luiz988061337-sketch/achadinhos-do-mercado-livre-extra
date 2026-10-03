"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Ações do ciclo de vida da oferta (transições validadas no servidor).
const ACOES: { status: string; rotulo: string; confirma?: string }[] = [
  { status: "approved", rotulo: "✅ Aprovar" },
  { status: "published", rotulo: "🚀 Publicar" },
  { status: "approved", rotulo: "⏸️ Pausar", confirma: "Pausar? A oferta sai do site e volta para aprovada." },
  { status: "expired", rotulo: "⌛ Expirar" },
  { status: "rejected", rotulo: "❌ Rejeitar" },
];

export default function OfertasActions({
  id,
  statusAtual,
}: {
  id: string;
  statusAtual: string;
}) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function mudar(novo: string, confirma?: string) {
    if (confirma && !window.confirm(confirma)) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/v3/offers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: novo }),
      });
      const j = await r.json();
      setMsg(j.ok ? "OK ✅" : j.error || "Falhou");
      if (j.ok) router.refresh();
    } catch {
      setMsg("Erro de rede.");
    }
    setBusy(false);
  }

  async function excluir() {
    if (!window.confirm("Excluir esta oferta?")) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(`/api/v3/offers?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const j = await r.json();
      setMsg(j.ok ? "Excluída ✅" : j.error || "Falhou");
      if (j.ok) router.refresh();
    } catch {
      setMsg("Erro de rede.");
    }
    setBusy(false);
  }

  // Pausar só faz sentido em publicada; aprovar/publicar conforme o estado.
  const visiveis = ACOES.filter((a) => {
    if (a.rotulo.startsWith("⏸️")) return statusAtual === "published";
    if (a.rotulo.startsWith("🚀")) return statusAtual === "approved";
    if (a.rotulo.startsWith("✅")) return statusAtual === "draft" || statusAtual === "pending";
    return true;
  });

  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {visiveis.map((a) => (
        <button
          key={a.rotulo}
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => mudar(a.status, a.confirma)}
        >
          {a.rotulo}
        </button>
      ))}
      {statusAtual !== "published" && (
        <button type="button" className="secondary" disabled={busy} onClick={excluir}>
          🗑️ Excluir
        </button>
      )}
      {msg ? <span style={{ fontSize: 12 }}> {msg}</span> : null}
    </span>
  );
}
