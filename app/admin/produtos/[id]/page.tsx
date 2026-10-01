import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProdutoForm from "@/components/ProdutoForm";

export default async function EditarProduto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("produtos").select("*").eq("id", id).single();
  if (!data) notFound();
  return <><h1>✏️ Editar produto</h1><ProdutoForm produto={data} /></>;
}