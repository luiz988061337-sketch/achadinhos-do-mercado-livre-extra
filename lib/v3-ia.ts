// IA V3 — ESTRUTURA (itens 14-15 da spec).
// Hoje: geração LOCAL por modelos (só dados reais, nada inventado).
// Futuro: plugar um provedor via interface IAProvider (server-only).
// A IA (local ou futura) recebe APENAS dados existentes: nunca inventa
// preço, desconto, avaliações, vendas, cupom, frete ou comissão.
// Sem IA_API_KEY configurada, o sistema usa o gerador local.

export type PublicacaoIA = {
  titulo: string;
  descricao: string;
  whatsapp: string;
  instagram: string;
  tiktok: string;
};

export type DadosReais = {
  titulo: string;
  preco: number;
  precoAntigo: number | null;
  desconto: number;
  cupom: string | null;
  freteGratis: boolean | null;
  rating: number | null;
  reviews: number | null;
  categoria: string | null;
};

function brl(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Gerador local determinístico — cada frase usa só campo presente.
export function gerarPublicacaoLocal(d: DadosReais): PublicacaoIA {
  const nome = d.titulo.trim();
  const preco = `Por ${brl(d.preco)}`;
  const de =
    d.precoAntigo != null && d.precoAntigo > d.preco ? ` (de ${brl(d.precoAntigo)})` : "";
  const off = d.desconto > 0 ? ` 🔥 ${d.desconto}% OFF` : "";
  const cupom = d.cupom ? ` 🎟️ Cupom ${d.cupom}` : "";
  const frete = d.freteGratis === true ? " 🚚 Frete grátis" : "";
  const aval =
    d.rating != null && Number(d.reviews) > 0
      ? ` ⭐ ${d.rating} (${Number(d.reviews).toLocaleString("pt-BR")} avaliações)`
      : "";
  return {
    titulo: `${nome} — ${brl(d.preco)}${off}`,
    descricao: `${nome}. ${preco}${de}.${off}${cupom}.${frete}${aval}. Confira a oferta no AchadinhosBR.`,
    whatsapp: `🛒 *Achadinho:* ${nome}\n💰 ${brl(d.preco)}${de}${off}${cupom}${frete}${aval ? `\n${aval}` : ""}\n\nConfira no AchadinhosBR 👇`,
    instagram: `🔥 ACHADINHO${off}\n\n${nome}\n\n${preco}${de}${cupom}${frete}${aval}\n\nLink na bio 👆`,
    tiktok: `🔥 ${nome} por ${brl(d.preco)}${off} — corre que acaba!${cupom}`,
  };
}

// Auditoria simples: garante que nenhum número/benefício aparece no texto
// sem existir nos dados (ex. "frete grátis" sem freteGratis=true).
export function auditarPublicacao(d: DadosReais, p: PublicacaoIA): string[] {
  const problemas: string[] = [];
  const tudo = [p.titulo, p.descricao, p.whatsapp, p.instagram, p.tiktok].join("\n");
  if (/frete grátis/i.test(tudo) && d.freteGratis !== true) {
    problemas.push("Menciona frete grátis sem dado confirmado.");
  }
  if (/cupom/i.test(tudo) && !d.cupom) {
    problemas.push("Menciona cupom sem código cadastrado.");
  }
  if (/avaliaç/i.test(tudo) && !(d.rating != null && Number(d.reviews) > 0)) {
    problemas.push("Menciona avaliações sem dados cadastrados.");
  }
  return problemas;
}

// Interface futura para provedor externo (server-only; chaves em env).
// Env sugeridas (NÃO criar sem provedor): IA_API_URL, IA_API_KEY, IA_MODEL.
export type IAProvider = {
  nome: string;
  gerar: (dados: DadosReais) => Promise<PublicacaoIA>;
};

export function provedorIAConfigurado(): boolean {
  return Boolean(process.env.IA_API_KEY && process.env.IA_API_URL);
}
