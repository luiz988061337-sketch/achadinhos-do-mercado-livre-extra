"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Renova em lote as expiradas mais clicadas: expired → draft + expires_at +7d.
// Depois é só aprovar/publicar no fluxo normal.
export default function RenovarExpiradas({ ids }: { ids: string[] }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  if (ids.length === 0) return null;

  async function renovar() {
    if (!window.confirm(`Renovar ${ids.length} expiradas por +7 dias (vão para rascunho)?`)) return;
    setBusy(true);
    setMsg("");
    const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    let ok = 0;
    let falha = "";
    for (const id of ids) {
      try {
        const r = await fetch("/api/v3/offers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: "draft", expires_at: expira }),
        });
        const j = await r.json();
        if (j.ok) ok += 1;
        else if (!falha) falha = j.error || "Falhou";
      } catch {
        if (!falha) falha = "Erro de rede.";
      }
    }
    setMsg(falha && ok === 0 ? falha : `Renovadas ${ok}/${ids.length} ✅ (rascunho +7d)`);
    setBusy(false);
    router.refresh();
  }

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button type="button" className="secondary" disabled={busy} onClick={renovar}>
        🔁 Renovar top {ids.length} +7d
      </button>
      {msg ? <span style={{ fontSize: 12 }}>{msg}</span> : null}
    </span>
  );
}
