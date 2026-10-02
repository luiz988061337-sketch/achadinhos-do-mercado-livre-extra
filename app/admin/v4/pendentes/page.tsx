import { createClient } from "@/lib/supabase/server";
import V4Pendentes from "@/components/V4Pendentes";

export default async function PendentesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("status", "pending")
    .order("score", { ascending: false })
    .limit(100);
  return <>
    <h1>✅ Aprovação — pending (V4)</h1>
    <p>Publicar exige <strong>affiliate_url oficial</strong>. Rejeitar descarta. Fila WA publica + enfileira.</p>
    <V4Pendentes iniciais={(data ?? []) as never} />
  </>;
}
