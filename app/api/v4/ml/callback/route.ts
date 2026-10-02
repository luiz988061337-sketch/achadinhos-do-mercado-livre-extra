import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/v4/ml/callback?code=TG-... — o ML redireciona para cá após o aceite.
// Troca o code por access+refresh tokens e salva em ml_tokens (só-admin via RLS).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") || "").trim();
  const erro = url.searchParams.get("error");
  const base = url.origin;
  if (erro || !code) return NextResponse.redirect(`${base}/admin/v4/pesquisar?ml=negado`);

  const clientId = (process.env.ML_CLIENT_ID || "").trim();
  const clientSecret = (process.env.ML_CLIENT_SECRET || "").trim();
  const redirectUri = `${base}/api/v4/ml/callback`;
  if (!clientId || !clientSecret) return NextResponse.redirect(`${base}/admin/v4/pesquisar?ml=semcred`);

  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": "AchadinhosBR/4.0" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.redirect(`${base}/admin/v4/pesquisar?ml=falhatoken`);
  const json = await res.json();
  const access = String(json?.access_token || "");
  const refresh = String(json?.refresh_token || "");
  if (!access || !refresh) return NextResponse.redirect(`${base}/admin/v4/pesquisar?ml=falhatoken`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${base}/auth/login`);

  const expiresAt = new Date(Date.now() + Number(json?.expires_in || 21600) * 1000).toISOString();
  const { error } = await supabase.from("ml_tokens").insert({
    access_token: access,
    refresh_token: refresh,
    expires_at: expiresAt,
    ml_user_id: String(json?.user_id || ""),
  });
  if (error) return NextResponse.redirect(`${base}/admin/v4/pesquisar?ml=errobanco`);
  return NextResponse.redirect(`${base}/admin/v4/pesquisar?ml=conectado`);
}
