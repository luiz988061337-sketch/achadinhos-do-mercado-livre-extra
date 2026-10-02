// Validação de link de afiliado (espelha o CHECK link_afiliado_valido do banco).
// Regras: https + domínio Mercado Livre + URL específica de oferta.
// Rejeita: vazio, homepage, carrinho/checkout, busca, URLs curtas/genéricas.

export type ValidacaoLink = { ok: boolean; motivo?: string; aviso?: string };

const HOST_RE = /(^|\.)(mercadolivre\.com(\.br)?|mlivre\.[a-z.]+)$/i;
const GENERIC_PATH_RE = /(^|\/)(cart|carrinho|checkout|search)(\/|$)/i;
const HOMEPAGE_RE = /^https?:\/\/([^/]+\.)?mercadolivre\.com(\.br)?\/?(\?.*)?$/i;

export function validarLinkAfiliado(valor: string): ValidacaoLink {
  const url = (valor || "").trim();
  if (!url) return { ok: false, motivo: "Informe o link de afiliado obtido na Central de Afiliados." };

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, motivo: "URL inválida. Cole o link completo (https://...)." };
  }

  if (u.protocol !== "https:") return { ok: false, motivo: "O link precisa começar com https://." };
  // Encurtador oficial do Mercado Livre (Central de Afiliados): sempre específico da oferta.
  if (/^https:\/\/meli\.la\/[A-Za-z0-9]{3,}\/?(\?.*)?$/i.test(url)) return { ok: true };
  if (!HOST_RE.test(u.hostname)) return { ok: false, motivo: "O link precisa ser do Mercado Livre (ou o encurtador oficial meli.la)." };
  if (HOMEPAGE_RE.test(url)) return { ok: false, motivo: "Não use a página inicial. Use o link específico da oferta." };
  if (GENERIC_PATH_RE.test(u.pathname)) return { ok: false, motivo: "Carrinho, checkout e busca não valem comissão. Use o link da oferta." };
  if (/busca/i.test(url)) return { ok: false, motivo: "Página de busca não vale. Use o link específico do produto." };
  if (url.length <= 30) return { ok: false, motivo: "Link curto/genérico demais. Use o link completo da oferta." };

  // Aviso (não bloqueia): parece listagem de categoria, confira.
  if (/^\/c(\/|$)/i.test(u.pathname) || /\/categorias\//i.test(u.pathname)) {
    return { ok: true, aviso: "Parece página de categoria. Confira se é a oferta específica do produto." };
  }

  return { ok: true };
}

// Extrai o identificador do anúncio (MLB...) quando presente na URL.
// É só leitura de padrão — não acessa nem copia dados do Mercado Livre.
export function extrairMlId(valor: string): string | null {
  const m = (valor || "").match(/MLB-?(\d{4,})/i);
  return m ? `MLB${m[1]}` : null;
}
