export type Produto = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  imagem: string;
  preco: number;
  preco_antigo: number | null;
  desconto: number | null;
  categoria: string;
  categoria_slug: string;
  avaliacao: number;
  avaliacoes: number;
  link_produto: string | null;
  link_afiliado: string | null;
  ml_product_id: string | null;
  ativo: boolean;
  destaque: boolean;
  prioridade: number;
  preco_atualizado_em: string | null;
  verificado_em: string | null;
  created_at?: string;
};

export type Categoria = {
  id: string;
  nome: string;
  slug: string;
  icone: string;
};