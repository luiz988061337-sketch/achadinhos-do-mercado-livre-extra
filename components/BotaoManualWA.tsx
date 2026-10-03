"use client";

import { useState } from "react";

// Botão manual — SEM automação, SEM API oficial.
// Copia a mensagem da fila ou abre o wa.me para envio manual
// (curadoria humana, sem risco de bloqueio por automação).
export default function BotaoManualWA({ message }: { message: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(message || "");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = message || "";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  }

  const href = `https://wa.me/?text=${encodeURIComponent(message || "")}`;

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button type="button" className="secondary" onClick={copiar}>
        {copiado ? "✅ Copiado!" : "📋 Copiar"}
      </button>
      <a
        className="secondary"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "none", padding: "6px 10px", border: "1px solid #ccc", borderRadius: 6 }}
      >
        ↗ Abrir no WhatsApp
      </a>
    </span>
  );
}
