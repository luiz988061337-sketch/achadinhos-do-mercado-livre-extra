import Link from "next/link";
import V4Pesquisa from "@/components/V4Pesquisa";
import { createClient } from "@/lib/supabase/server";

const MSG: Record<string, string> = {
  conectado: "✅ Conta do Mercado Livre conectada! A busca já funciona.",
  negado: "⚠️ Você negou a autorização no ML. Tente de novo quando quiser.",
  semcred: "⚠️ Falta ML_CLIENT_ID no servidor.",
  falhatoken: "⚠️ O ML não retornou o token. Tente conectar de novo.",
  errobanco: "⚠️ Conectou no ML mas falhou ao salvar. Rode a migração ml-oauth no Supabase.",
};

export default async function PesquisarPage({ searchParams }: { searchParams: Promise<{ ml?: string }> }) {
  const sp = await searchParams;
  const aviso = sp.ml ? MSG[sp.ml] : null;
  const supabase = await createClient();
  const { count } = await supabase.from("ml_tokens").select("*", { count: "exact", head: true });
  const conectado = (count ?? 0) > 0;

  return <>
    <h1>🔎 Pesquisar ofertas (V4)</h1>
    <p>Busca oficial, salva como <strong>pending</strong>. Nada é publicado sozinho.</p>
    {aviso ? <p className="notice">{aviso}</p> : null}
    <div className="notice">
      {conectado
        ? <>🟢 Mercado Livre <strong>conectado</strong> (busca liberada). <Link href="/api/v4/ml/auth">Reconectar</Link></>
        : <>🔴 Mercado Livre <strong>não conectado</strong> — a busca exige autorização. <Link href="/api/v4/ml/auth"><strong>Conectar Mercado Livre</strong></Link></>}
    </div>
    <V4Pesquisa />
  </>;
}
