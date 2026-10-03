"use client";

import { useEffect, useRef } from "react";
import type { TipoEvento } from "@/lib/v3-track";

// Registra visualização sem travar a página (analytics, sem PII).
export default function RegistradorView({
  offerId,
  tipo,
  source,
  campaign,
}: {
  offerId?: string;
  tipo: TipoEvento;
  source?: string;
  campaign?: string;
}) {
  const enviado = useRef(false);
  useEffect(() => {
    if (enviado.current) return;
    enviado.current = true;
    try {
      let sessionId: string | null = null;
      try {
        sessionId = document.cookie.match(/(?:^|; )ach_sid=([^;]*)/)?.[1] ?? null;
      } catch {
        sessionId = null;
      }
      fetch("/api/v3/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer_id: offerId, tipo, source, campaign, session_id: sessionId }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Analytics nunca quebra a página.
    }
  }, [offerId, tipo, source, campaign]);
  return null;
}
