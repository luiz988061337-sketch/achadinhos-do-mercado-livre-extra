"use client";

import { useEffect } from "react";

// Identificador anônimo de sessão (cookie próprio, 1 ano).
// Serve só para agrupar cliques da mesma pessoa sem identificar ninguém.
// Não contém dado pessoal.
export default function SidCookie() {
  useEffect(() => {
    if (!document.cookie.split("; ").some((c) => c.startsWith("ach_sid="))) {
      const sid = (crypto as Crypto).randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      document.cookie = `ach_sid=${sid}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, []);
  return null;
}
