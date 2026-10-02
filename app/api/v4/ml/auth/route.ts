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
  // Fixa e canônica: PRECISA ser idêntica à cadastrada no app (DevCenter).
  const redirectUri =
    (process.env.ML_REDIRECT_URI || "").trim() ||
    "https://achadinhos-nine.vercel.app/api/v4/ml/callback";
  const auth = new URL("https://auth.mercadolivre.com.br/authorization");
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", redirectUri);
  // offline_access = devolve refresh_token (renovação automática ~6 meses).
  auth.searchParams.set("scope", "offline_access read write");
  return NextResponse.redirect(auth);
}
