// Score V4 de 0 a 100 — só usa dados reais salvos no produto.
// Pesos (total 100):
// - desconto real: até 30 (desconto % / 60 * 30, teto 30)
// - avaliação: até 20 (rating/5 * 20, com penalidade se reviews < 10)
// - vendas (sold): até 20 (escala log: min(1, log10(sold+1)/4) * 20)
// - preço competitivo: até 15 (quanto menor o preço vs teto dinâmico; usa old_price como âncora)
// - comissão: até 15 (commission_rate/20 * 15, teto 15; 0 se sem comissão)
// Bônus "potencial de oferta": +5 se desconto>=20 E rating>=4.5 E sold>=100 (teto 100).
// Determinístico, sem API externa, auditável no painel.

export type ScoreInput = {
  price: number;
  old_price?: number | null;
  discount?: number | null;
  rating?: number | null;
  reviews?: number | null;
  sold?: number | null;
  commission?: number | null;
  commission_rate?: number | null;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function descontoEfetivo(input: ScoreInput): number {
  if (input.discount !== null && input.discount !== undefined && Number(input.discount) > 0) {
    return clamp(Number(input.discount), 0, 90);
  }
  const preco = Number(input.price);
  const antigo = Number(input.old_price);
  if (antigo > 0 && preco >= 0 && antigo > preco) {
    return clamp(Math.round(((antigo - preco) / antigo) * 100), 0, 90);
  }
  return 0;
}

export function calcularScore(input: ScoreInput): { score: number; partes: Record<string, number> } {
  const preco = Number(input.price) || 0;
  const antigo = Number(input.old_price) || 0;
  const desc = descontoEfetivo(input);
  const rating = clamp(Number(input.rating) || 0, 0, 5);
  const reviews = Math.max(0, Number(input.reviews) || 0);
  const sold = Math.max(0, Number(input.sold) || 0);
  const commissionRate = clamp(Number(input.commission_rate) || 0, 0, 100);

  // 1. Desconto (0-30)
  const pDesconto = clamp((desc / 60) * 30, 0, 30);

  // 2. Avaliação (0-20): penaliza 40% se poucas avaliações (<10)
  const fatorConfianca = reviews >= 50 ? 1 : reviews >= 10 ? 0.85 : 0.6;
  const pAvaliacao = clamp((rating / 5) * 20, 0, 20) * fatorConfianca;

  // 3. Vendas (0-20): log10 — 10 vendas ~5pts, 100 ~10pts, 1000 ~15pts, 10k ~20pts
  const pVendas = clamp((Math.log10(sold + 1) / 4) * 20, 0, 20);

  // 4. Preço (0-15): âncora no old_price; sem âncora, preço baixo pontua um pouco
  let pPreco = 0;
  if (antigo > 0 && preco >= 0 && antigo >= preco) {
    const economiaRel = (antigo - preco) / antigo; // 0..1
    pPreco = clamp(economiaRel * 30, 0, 15);
  } else if (preco > 0 && preco <= 100) {
    pPreco = 6;
  } else if (preco > 0 && preco <= 300) {
    pPreco = 4;
  }

  // 5. Comissão (0-15): rate 20%+ = teto; sem comissão = 0 (não zera o resto)
  const pComissao = clamp((commissionRate / 20) * 15, 0, 15);

  let total = pDesconto + pAvaliacao + pVendas + pPreco + pComissao;

  // Bônus potencial de oferta
  if (desc >= 20 && rating >= 4.5 && sold >= 100) total += 5;

  const score = clamp(Math.round(total), 0, 100);
  return {
    score,
    partes: {
      desconto: Math.round(pDesconto),
      avaliacao: Math.round(pAvaliacao),
      vendas: Math.round(pVendas),
      preco: Math.round(pPreco),
      comissao: Math.round(pComissao),
    },
  };
}
