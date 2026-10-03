"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Estende o vencimento de oferta publicada sem trocar o status.
// PATCH só com expires_at (sem transição) — seguro e em 1 clique.
export default function EstenderVencimento({ id }: { id: string }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function estender(dias: number) {
    setBusy(true);
    setMsg("");
    try {
      const expira = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
      const r = await fetch("/api/v3/offers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, expires_at: expira }),
      });
      const j = await r.json();
      setMsg(j.ok ? `+${dias}d ✅` : j.error || "Falhou");
      if (j.ok) router.refresh();
    } catch {
      setMsg("Erro de rede.");
    }
    setBusy(false);
  }

  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <button type="button" className="secondary" disabled={busy} onClick={() => estender(7)}>
        +7d
      </button>
      <button type="button" className="secondary" disabled={busy} onClick={() => estender(30)}>
        +30d
      </button>
      {msg ? <span style={{ fontSize: 12 }}>{msg}</span> : null}
    </span>
  );
}
