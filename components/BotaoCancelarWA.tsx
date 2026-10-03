"use client";

import { useState } from "react";

export default function BotaoCancelarWA({ queueId }: { queueId: string }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function cancelar() {
    if (!confirm("Cancelar este item da fila?")) return;
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/v4/whatsapp/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queue_id: queueId }),
    });
    const j = await r.json();
    if (j.ok) {
      setMsg("Cancelado ✅");
      setTimeout(() => window.location.reload(), 800);
    } else {
      setMsg(j.error || "Falha ao cancelar.");
    }
    setBusy(false);
  }

  return <span><button className="secondary" onClick={cancelar} disabled={busy}>{busy ? "…" : "✖ Cancelar"}</button>{msg ? <span style={{ fontSize: 12 }}> {msg}</span> : null}</span>;
}
