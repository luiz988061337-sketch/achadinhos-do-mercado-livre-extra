import { NextResponse } from "next/server";
import { exigirAdmin, ehErroResponse } from "@/lib/v4-guard";

// GET /api/v4/ml/auth — inicia o OAuth: manda o admin autorizar no ML.
// O redirect_uri PRECISA estar cadastrado no app (DevCenter → URLs de redirecionamento).
export async function GET(req: Request) {
  try {
    await exigirAdmin();
  } catch (e) {
    if (ehErroResponse(e)) return e;
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  const clientId = (process.env.ML_CLIENT_ID || "").trim();
  if (!clientId) return NextResponse.json({ error: "Configure ML_CLIENT_ID no servidor." }, { status: 428 });
  const redirectUri = new URL("/api/v4/ml/callback", req.url).origin + "/api/v4/ml/callback";
  const auth = new URL("https://auth.mercadolivre.com.br/authorization");
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", redirectUri);
  return NextResponse.redirect(auth);
}
