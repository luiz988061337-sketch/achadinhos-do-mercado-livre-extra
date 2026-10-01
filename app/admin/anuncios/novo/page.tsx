import { createClient } from "@/lib/supabase/server";
import GeradorAnuncio from "@/components/GeradorAnuncio";

export default async function NovoAnuncio({ searchParams }: { searchParams: Promise<{ produto?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("produtos").select("*").order("created_at", { ascending: false }).limit(500);
  const lista = data ?? [];

  return <>
    <h1>🪄 Gerar anúncio</h1>
    <p>Arte + textos prontos a partir dos dados reais do cadastro. Sem IA externa, sem custo.</p>
    {lista.length === 0
      ? <div className="notice">Cadastre produtos primeiro.</div>
      : <GeradorAnuncio produtos={lista} produtoInicialId={sp.produto} />}
  </>;
}
