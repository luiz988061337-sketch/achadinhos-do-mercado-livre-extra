"use client";

import { useRef } from "react";
import ProductCard from "@/components/ProductCard";
import type { Produto } from "@/lib/types";

type Props = {
  titulo: string;
  subtitulo?: string;
  produtos: Produto[];
};

export default function CarrosselOfertas({ titulo, subtitulo, produtos }: Props) {
  const trilho = useRef<HTMLDivElement>(null);

  function rolar(direcao: 1 | -1) {
    const el = trilho.current;
    if (!el) return;
    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direcao * Math.min(el.clientWidth * 0.8, 560), behavior: reduz ? "auto" : "smooth" });
  }

  if (produtos.length === 0) return null;

  return <section className="section" aria-labelledby="carrossel-titulo">
    <div className="sectionHeader">
      <div><h2 id="carrossel-titulo">{titulo}</h2>{subtitulo ? <p className="carrosselSub">{subtitulo}</p> : null}</div>
      <div className="carrosselBtns">
        <button type="button" className="carrosselBtn" onClick={() => rolar(-1)} aria-label="Ver ofertas anteriores">‹</button>
        <button type="button" className="carrosselBtn" onClick={() => rolar(1)} aria-label="Ver próximas ofertas">›</button>
      </div>
    </div>
    <div ref={trilho} className="carrossel" role="region" aria-roledescription="carrossel" aria-label={titulo} tabIndex={0}>
      {produtos.map((p, i) => <div key={p.id} className="carrosselItem" role="group" aria-roledescription="slide" aria-label={`${i + 1} de ${produtos.length}`}>
        <ProductCard produto={p} />
      </div>)}
    </div>
  </section>;
}
