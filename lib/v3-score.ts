// Score V3 de 0 a 100 — usa SOMENTE dados reais cadastrados.
// Pesos da especificação (total 100):
// - desconto real: até 30
// - histórico de preço: até 25
// - avaliação: até 15
// - popularidade (vendas): até 10
// - comissão: até 10
// - cupom/frete: até 10
// Critério sem dado = 0 pontos (nunca inventa). Métrica INTERNA do
// AchadinhosBR — não é garantia de menor preço do mercado.

import type { ScoreLevel } from "@/lib/v3-types";

export type ScoreOfertaInput = {
  desconto: number | null; // % efetivo (oferta ou produto)
  precoAtual: number;
  precoMinimo: number | null; // menor preço registrado
  registrosHistorico: number; // nº de registros em price_history
  rating: number | null; // 0-5
  reviews: number | null; // nº de avaliações
  sold: number | null; // nº de vendas
  commissionRate: number | null; // % comissão
  temCupom: boolean;
  freteGratis: boolean;
};

export type ScoreResultado = {
  score: number;
  nivel: ScoreLevel;
  partes: Record<string, number>;
  historicoInsuficiente: boolean;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function nivelScore(score: number): ScoreLevel {
  if (score >= 90) return "EXCELENTE";
  if (score >= 75) return "BOA";
  if (score >= 60) return "NORMAL";
  return "NAO_RECOMENDADA";
}

export function calcularScoreOferta(input: ScoreOfertaInput): ScoreResultado {
  const desc = clamp(Number(input.desconto) || 0, 0, 90);
  const precoAtual = Number(input.precoAtual) || 0;
  const minimo = input.precoMinimo != null ? Number(input.precoMinimo) : null;
  const registros = Math.max(0, Number(input.registrosHistorico) || 0);

  // 1. Desconto (0-30): 40%+ = teto, abaixo linear.
  const pDesconto = desc >= 40 ? 30 : (desc / 40) * 30;

  // 2. Histórico (0-25): preço atual vs menor registrado.
  // <2 registros = insuficiente = 0 (sem inventar comparação).
  let pHistorico = 0;
  const historicoInsuficiente = registros < 2 || minimo == null || minimo <= 0;
  if (!historicoInsuficiente && precoAtual > 0) {
    if (precoAtual <= minimo) pHistorico = 25;
    else {
      const acima = (precoAtual - minimo) / minimo;
      if (acima <= 0.05) pHistorico = 20;
      else if (acima <= 0.1) pHistorico = 15;
      else if (acima <= 0.2) pHistorico = 10;
      else pHistorico = 5;
    }
  }

  // 3. Avaliação (0-15): confiança cai com poucas avaliações.
  const rating = clamp(Number(input.rating) || 0, 0, 5);
  const reviews = Math.max(0, Number(input.reviews) || 0);
  const fator = reviews >= 50 ? 1 : reviews >= 10 ? 0.85 : 0.6;
  const pAvaliacao = ((rating / 5) * 15) * fator;

  // 4. Popularidade (0-10): escala log de vendas.
  const sold = Math.max(0, Number(input.sold) || 0);
  const pPopularidade = clamp((Math.log10(sold + 1) / 4) * 10, 0, 10);

  // 5. Comissão (0-10): 20%+ = teto; ausente = 0 (não zera o resto).
  const rate = clamp(Number(input.commissionRate) || 0, 0, 100);
  const pComissao = clamp((rate / 20) * 10, 0, 10);

  // 6. Cupom/frete (0-10): +5 cupom, +5 frete grátis.
  const pCupomFrete = (input.temCupom ? 5 : 0) + (input.freteGratis ? 5 : 0);

  const score = clamp(
    Math.round(pDesconto + pHistorico + pAvaliacao + pPopularidade + pComissao + pCupomFrete),
    0,
    100
  );

  return {
    score,
    nivel: nivelScore(score),
    partes: {
      desconto: Math.round(pDesconto),
      historico: Math.round(pHistorico),
      avaliacao: Math.round(pAvaliacao),
      popularidade: Math.round(pPopularidade),
      comissao: Math.round(pComissao),
      cupomFrete: Math.round(pCupomFrete),
    },
    historicoInsuficiente,
  };
}

// Resumo de preços para o painel (menor/maior/anterior/atual).
export function resumoPrecos(
  historico: { price: number; recorded_at: string }[]
): {
  atual: number | null;
  minimo: number | null;
  maximo: number | null;
  anterior: number | null;
  registros: number;
  insuficiente: boolean;
} {
  const precos = (historico || [])
    .map((h) => Number(h.price))
    .filter((p) => p > 0);
  if (precos.length === 0) {
    return { atual: null, minimo: null, maximo: null, anterior: null, registros: 0, insuficiente: true };
  }
  const ordenados = [...precos].sort((a, b) => a - b);
  return {
    atual: precos[precos.length - 1],
    minimo: ordenados[0],
    maximo: ordenados[ordenados.length - 1],
    anterior: precos.length >= 2 ? precos[precos.length - 2] : null,
    registros: precos.length,
    insuficiente: precos.length < 2,
  };
}
