import type { SupabaseClient } from "@supabase/supabase-js";

// Ranking por cliques reais em um período (crescimento).
// Nunca inventa vendas, conversões ou avaliações: só conta cliques.
// Retorna os produtos ativos ordenados do mais para o menos clicado.
export async function topClicados(
  supabase: SupabaseClient,
  dias: number,
  limite = 8
): Promise<{ produto_id: string; cliques: number }[]> {
  const desde = new Date(Date.now() - dias * 24 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("cliques")
    .select("produto_id")
    .gte("criado_em", desde)
    .limit(2000);
  const contagem = new Map<string, number>();
  for (const c of data ?? []) {
    contagem.set(c.produto_id, (contagem.get(c.produto_id) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .map(([produto_id, cliques]) => ({ produto_id, cliques }))
    .sort((a, b) => b.cliques - a.cliques)
    .slice(0, limite);
}
