export type Produto = {
  id: string;
  slug: string;
  nome: string;
  imagem: string;
  preco: number;
  preco_antigo: number | null;
  desconto: number | null;
  categoria: string;
  categoria_slug: string;
  avaliacao: number;
  avaliacoes: number;
  destaque: boolean;
  link_afiliado: string;
  ativo: boolean;
  created_at?: string;
};

export type Categoria = {
  id: string;
  nome: string;
  slug: string;
  icone: string;
};