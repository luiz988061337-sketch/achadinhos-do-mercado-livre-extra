"use client";

import { useState } from "react";

// Envio oficial 1:1 com opções. Curadoria humana: o admin escolhe o destino
// (vazio = WHATSAPP_TEST_TO do servidor) e o modo de envio.
// Grupos NÃO são suportados pela Cloud API: para grupos use BotaoManualWA.
export default function BotaoEnviarWA({ queueId }: { queueId: string }) {
  const [to, setTo] = useState("");
  const [tipo, setTipo] = useState("auto");
  const [template, setTemplate] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function enviar() {
    setBusy(true);
    setMsg("");
    try {
      const body: Record<string, string> = { queue_id: queueId };
      if (to.trim()) body.to = to.trim();
      if (tipo !== "auto") body.tipo = tipo;
      if (template.trim()) body.template = template.trim();
      const r = await fetch("/api/v4/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (j.ok) {
        setMsg(`Enviado ✅ (${j.via ?? "texto"})`);
      } else {
        setMsg(j.error || j.aviso || "Falhou");
      }
    } catch {
      setMsg("Erro de rede.");
    }
    setBusy(false);
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
      <input
        type="tel"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="Destino (vazio = teste)"
        title="DDI+DDD+número, só dígitos. Vazio usa WHATSAPP_TEST_TO."
        style={{ width: 170 }}
      />
      <span style={{ display: "inline-flex", gap: 6 }}>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} title="Modo de envio">
          <option value="auto">Auto (imagem+texto)</option>
          <option value="texto">Só texto</option>
          <option value="imagem">Forçar imagem</option>
        </select>
        <input
          type="text"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder="Template (opcional)"
          title="Nome do template aprovado — obrigatório fora da janela de 24h"
          style={{ width: 150 }}
        />
      </span>
      <span>
        <button className="secondary" onClick={enviar} disabled={busy}>
          {busy ? "…" : "📤 Enviar (API oficial)"}
        </button>
        {msg ? <span style={{ fontSize: 12 }}> {msg}</span> : null}
      </span>
    </span>
  );
}
