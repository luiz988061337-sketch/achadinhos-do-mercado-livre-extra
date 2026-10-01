import type { Produto } from "@/lib/types";
import { brl } from "@/components/ProductCard";
import { descontoReal } from "@/lib/criativos";

// Textos locais (sem IA externa): 5 versões a partir de dados reais.
// Nunca promete economia/benefício não comprovado. O link da oferta
// é colado à parte pelo administrador — nunca inventado aqui.

export type VersaoTexto = { id: string; rotulo: string; texto: string };

function linhaPreco(p: Produto): string {
  const preco = Number(p.preco);
  const antigo = p.preco_antigo !== null ? Number(p.preco_antigo) : null;
  if (antigo !== null && antigo > preco) return `De ${brl(antigo)} por ${brl(preco)}`;
  return brl(preco);
}

export function gerarTextos(p: Produto): VersaoTexto[] {
  const nome = p.nome.trim();
  const preco = linhaPreco(p);
  const desc = descontoReal(p);
  const aval = Number(p.avaliacoes ?? 0) > 0 ? ` ⭐ ${p.avaliacao} (${Number(p.avaliacoes).toLocaleString("pt-BR")} avaliações)` : "";
  const selo = desc > 0 ? ` 🏷️ ${desc}% OFF` : "";

  return [
    {
      id: "feed",
      rotulo: "Versão 1 — Instagram/Facebook",
      texto: `🔥 ACHADINHO DO DIA\n\n${nome}\n\n${preco}${selo}${aval}\n\nConfira a oferta 👇`
    },
    {
      id: "stories",
      rotulo: "Versão 2 — Stories",
      texto: `🔥 ${nome}\n${preco}${selo}\n\nArraste e confira 👆`
    },
    {
      id: "whatsapp",
      rotulo: "Versão 3 — WhatsApp",
      texto: `🛒 *Achadinho:* ${nome}\n💰 ${preco}${desc > 0 ? ` (${desc}% OFF)` : ""}${aval ? `\n⭐ ${p.avaliacao} — ${Number(p.avaliacoes).toLocaleString("pt-BR")} avaliações` : ""}\n\nConfira no AchadinhosBR 👇`
    },
    {
      id: "pinterest",
      rotulo: "Versão 4 — Pinterest",
      texto: `${nome} — ${preco}${selo}. Achadinho garimpado no AchadinhosBR.`
    },
    {
      id: "pago",
      rotulo: "Versão 5 — Anúncio pago (teste)",
      texto: `Procurando ${p.categoria.toLowerCase()} com desconto real? ${nome} por ${preco}${desc > 0 ? ` (${desc}% OFF no preço original)` : ""}.${aval ? ` Nota ${p.avaliacao} de quem já comprou.` : ""} Veja o achadinho 👇`
    }
  ];
}
