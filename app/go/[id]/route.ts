import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: produto } = await supabase
    .from("produtos")
    .select("id, link_afiliado")
    .eq("id", id)
    .eq("ativo", true)
    .single();

  if (!produto?.link_afiliado) {
    return NextResponse.redirect(new URL("/ofertas", request.url));
  }

  const referer = request.headers.get("referer");
  const userAgent = request.headers.get("user-agent");
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || null;

  await supabase.from("cliques").insert({
    produto_id: produto.id,
    pagina_origem: referer,
    user_agent: userAgent,
    ip: ip
  });

  return NextResponse.redirect(produto.link_afiliado, { status: 302 });
}