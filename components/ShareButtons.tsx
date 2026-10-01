"use client";

import { useEffect, useState } from "react";

// Botão "Compartilhar oferta": usa a página do produto no AchadinhosBR
// com a etiqueta do canal (?origem=...), permitindo medir a origem
// quando o visitante seguir até a saída. Web Share API no celular.
export default function ShareButtons({ titulo, path }: { titulo: string; path: string }) {
  const [nativo, setNativo] = useState(false);
  const [copiado, setCopiado] = useState("");

  useEffect(() => {
    setNativo(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  function urlDe(canal: string) {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}${path}?origem=${canal}`;
  }

  async function compartilhar() {
    try {
      await navigator.share({ title: titulo, url: urlDe("ACHADINHOS_SITE") });
    } catch {
      // usuário cancelou
    }
  }

  async function copiar(canal: string) {
    const url = urlDe(canal);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiado("Link copiado!");
    setTimeout(() => setCopiado(""), 2500);
  }

  const texto = encodeURIComponent(`${titulo} — achei aqui:`);
  const redes = [
    { nome: "WhatsApp", href: (c: string) => `https://wa.me/?text=${texto}%20${encodeURIComponent(urlDe(c))}`, canal: "ACHADINHOS_WHATSAPP" },
    { nome: "Telegram", href: (c: string) => `https://t.me/share/url?url=${encodeURIComponent(urlDe(c))}&text=${texto}`, canal: "ACHADINHOS_WHATSAPP" },
    { nome: "Facebook", href: (c: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlDe(c))}`, canal: "ACHADINHOS_FACEBOOK" }
  ];

  return <div className="shareRow" role="group" aria-label="Compartilhar oferta">
    {nativo ? <button type="button" className="secondary" onClick={compartilhar}>📤 Compartilhar</button> : null}
    {redes.map((r) => <a key={r.nome} className="secondary shareLink" href={r.href(r.canal)} target="_blank" rel="noopener noreferrer">Compartilhar no {r.nome}</a>)}
    <button type="button" className="secondary" onClick={() => copiar("ACHADINHOS_SITE")}>🔗 Copiar link</button>
    {copiado ? <span className="successMsg" role="status">{copiado}</span> : null}
  </div>;
}
