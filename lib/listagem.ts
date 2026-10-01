// Paginação e ordenação das listagens (FASE 7/9). Consultas paginadas:
// nunca carrega milhares de produtos de uma vez.
export const POR_PAGINA = 24;

export type Ordem = "recentes" | "desconto" | "preco-asc" | "preco-desc" | "cliques";

export const ORDENACOES: { id: Ordem; rotulo: string }[] = [
  { id: "recentes", rotulo: "Mais recentes" },
  { id: "desconto", rotulo: "Maior desconto" },
  { id: "preco-asc", rotulo: "Menor preço" },
  { id: "preco-desc", rotulo: "Maior preço" },
  { id: "cliques", rotulo: "Mais clicados" }
];

export function lerOrdem(v: string | undefined): Ordem {
  return ORDENACOES.some((o) => o.id === v) ? (v as Ordem) : "recentes";
}

export function lerPagina(v: string | undefined): number {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function hrefLista(base: string, params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}
