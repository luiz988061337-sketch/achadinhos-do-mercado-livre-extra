import { createClient } from "@/lib/supabase/server";
import LoteArtes from "@/components/LoteArtes";

export default async function LoteArtesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("produtos").select("*").eq("ativo", true).order("created_at", { ascending: false }).limit(500);

  return <>
    <h1>🖼️ Gerar 5 artes quadradas</h1>
    <p>Selecione 5 produtos ativos. Cada arte sai em 1080×1080 (Feed/WhatsApp), com modelos distribuídos para não ficarem iguais.</p>
    {(data ?? []).length < 5
      ? <div className="notice">Você precisa de pelo menos 5 produtos ativos com imagem e preço válidos.</div>
      : <LoteArtes produtos={data ?? []} />}
  </>;
}
