"use client";

import { useState } from "react";

export default function BotaoEnviarWA({ queueId }: { queueId: string }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function enviar() {
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/v4/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queue_id: queueId }),
    });
    const j = await r.json();
    setMsg(j.error || j.aviso || "Enviado ✅");
    setBusy(false);
  }

  return <span><button className="secondary" onClick={enviar} disabled={busy}>{busy ? "…" : "📤 Enviar (API oficial)"}</button>{msg ? <span style={{ fontSize: 12 }}> {msg}</span> : null}</span>;
}
