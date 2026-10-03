"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Publica em lote: draft/pending → approved → published (com cheque de afiliado no servidor).
// Pula com erro explicado quem está sem affiliate oficial.
export default function PublicarLote({ ids }: { ids: string[] }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  if (ids.length === 0) return null;

  async function publicar() {
    if (!window.confirm(`Publicar ${ids.length} ofertas? (só com affiliate oficial)`)) return;
    setBusy(true);
    setMsg("");
    let ok = 0;
    const falhas: string[] = [];
    for (const id of ids) {
      try {
        // Garante approved antes de publicar (idempotente no servidor).
        await fetch("/api/v3/offers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: "approved" }),
        });
        const r = await fetch("/api/v3/offers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: "published" }),
        });
        const j = await r.json();
        if (j.ok) ok += 1;
        else falhas.push(`${id.slice(0, 8)}: ${j.error || "falhou"}`);
      } catch {
        falhas.push(`${id.slice(0, 8)}: rede`);
      }
    }
    setMsg(falhas.length === 0 ? `Publicadas ${ok}/${ids.length} ✅` : `Publicadas ${ok}/${ids.length} · falhas: ${falhas.slice(0, 3).join(" | ")}${falhas.length > 3 ? "…" : ""}`);
    setBusy(false);
    router.refresh();
  }

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button type="button" disabled={busy} onClick={publicar}>
        🚀 Publicar lote ({ids.length})
      </button>
      {msg ? <span style={{ fontSize: 12 }}>{msg}</span> : null}
    </span>
  );
}
