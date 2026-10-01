import { NextResponse } from "next/server";

// Compatibilidade: /go/[id] agora só encaminha para a etapa de saída.
// O clique é registrado uma única vez, na página /sair/[id].
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const atual = new URL(request.url);
  const destino = new URL(`/sair/${id}`, request.url);
  const origem = atual.searchParams.get("origem");
  if (origem) destino.searchParams.set("origem", origem);
  return NextResponse.redirect(destino, { status: 307 });
}
