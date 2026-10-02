import { createClient } from "@/lib/supabase/server";
import CompararSeletor from "@/components/CompararSeletor";
import { brl } from "@/components/ProductCard";

export const metadata = {
  title: "Comparar ofertas | AchadinhosBR",
  description: "Compare preço, desconto, avaliação e score lado a lado antes de comprar.",
};

type ItemComparado = {
  chave: string;
  titulo: string;
  imagem: string;
  preco: number;
  precoAntigo: number | null;
  desconto: number | null;
  avaliacao: number;
  avaliacoes: string;
  loja: string;
  score: number | null;
  hrefOferta: string;
};

async function buscarPorChaves(supabase: Awaited<ReturnType<typeof createClient>>, chaves: string[]): Promise<ItemComparado[]> {
  const idsV4 = chaves.filter((c) => c.startsWith("v4:")).map((c) => c.slice(3));
  const idsLeg = chaves.filter((c) => c.startsWith("leg:")).map((c) => c.slice(4));
  const out: ItemComparado[] = [];
  if (idsV4.length > 0) {
    const { data } = await supabase.from("products").select("*").in("id", idsV4).eq("status", "approved");
    for (const p of data ?? []) {
      out.push({
        chave: `v4:${p.id}`, titulo: p.title, imagem: p.image,
        preco: Number(p.price), precoAntigo: p.old_price != null ? Number(p.old_price) : null,
        desconto: p.discount, avaliacao: Number(p.rating) || 0,
        avaliacoes: `${Number(p.sold).toLocaleString("pt-BR")} vendidos`,
        loja: p.marketplace === "shopee" ? "Shopee" : "Mercado Livre",
        score: p.score, hrefOferta: `/ver/${p.id}`,
      });
    }
  }
  if (idsLeg.length > 0) {
    const { data } = await supabase.from("produtos").select("*").in("id", idsLeg).eq("ativo", true);
    for (const p of data ?? []) {
      const preco = Number(p.preco);
      const antigo = p.preco_antigo != null ? Number(p.preco_antigo) : null;
      out.push({
        chave: `leg:${p.id}`, titulo: p.nome, imagem: p.imagem,
        preco, precoAntigo: antigo, desconto: p.desconto,
        avaliacao: Number(p.avaliacao) || 0,
        avaliacoes: `${Number(p.avaliacoes ?? 0).toLocaleString("pt-BR")} avaliações`,
        loja: "Mercado Livre", score: null, hrefOferta: `/sair/${p.id}`,
      });
    }
  }
  // Mantém a ordem pedida na URL.
  const pos = new Map(chaves.map((c, i) => [c, i]));
  return out.sort((a, b) => (pos.get(a.chave) ?? 99) - (pos.get(b.chave) ?? 99));
}

function melhorPreco(itens: ItemComparado[]): number {
  return Math.min(...itens.map((i) => i.preco));
}

export default async function Comparar({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const sp = await searchParams;
  const chaves = (sp.ids || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const supabase = await createClient();
  const itens = chaves.length > 0 ? await buscarPorChaves(supabase, chaves) : [];
  const menor = itens.length > 1 ? melhorPreco(itens) : null;

  const linhas: { rotulo: string; render: (i: ItemComparado) => React.ReactNode; destaque?: (i: ItemComparado) => boolean }[] = [
    { rotulo: "Preço", render: (i) => <strong>{brl(i.preco)}</strong>, destaque: (i) => menor !== null && i.preco === menor },
    { rotulo: "Preço anterior", render: (i) => (i.precoAntigo !== null && i.precoAntigo > i.preco ? brl(i.precoAntigo) : "—") },
    { rotulo: "Desconto", render: (i) => (i.desconto ? `${i.desconto}% OFF` : "—") },
    { rotulo: "Loja", render: (i) => i.loja },
    { rotulo: "Score", render: (i) => (i.score !== null ? `⭐ ${i.score}` : "—") },
  ];

  return <div className="container">
    <div className="pageTitle">
      <h1>⚖️ Comparar ofertas</h1>
      <p>Escolha até 3 produtos e compare lado a lado. Preços podem ter mudado na loja.</p>
    </div>
    <CompararSeletor selecionados={chaves} />
    {itens.length === 0 ? <p className="notice">Busque acima e adicione produtos para comparar.</p> : <>
      <div className="products">
        {itens.map((i) => <article key={i.chave} className="card">
          <div className="cardImage"><img src={i.imagem} alt={i.titulo} loading="lazy" /></div>
          <div className="cardBody">
            <div className="cardTitle">{i.titulo}</div>
            <div className="rating">⭐ {i.avaliacao.toFixed(1)} · {i.avaliacoes}</div>
            <a className="buy" href={i.hrefOferta}>Ver oferta ({i.loja})</a>
          </div>
        </article>)}
      </div>
      <div className="tableWrap"><table className="table">
        <thead><tr><th></th>{itens.map((i) => <th key={i.chave}>{i.titulo.slice(0, 40)}</th>)}</tr></thead>
        <tbody>
          {linhas.map((l) => <tr key={l.rotulo}>
            <td><strong>{l.rotulo}</strong></td>
            {itens.map((i) => <td key={i.chave} style={l.destaque?.(i) ? { background: "#e6f7e6", fontWeight: 700 } : undefined}>{l.render(i)}</td>)}
          </tr>)}
          <tr><td><strong>Avaliação</strong></td>{itens.map((i) => <td key={i.chave}>⭐ {i.avaliacao.toFixed(1)}<br /><span style={{ fontSize: 12 }}>{i.avaliacoes}</span></td>)}</tr>
        </tbody></table></div>
      <p className="notice">Links de afiliado: podemos receber comissão, sem custo extra. Confira preço e disponibilidade na loja.</p>
    </>}
  </div>;
}
