// Tokens OAuth de USUÁRIO do ML (server-only).
// A busca de anúncios exige user token (authorization_code). O app token
// (client_credentials) serve para catálogo/categorias, mas a search barra.
// Fluxo: /api/v4/ml/auth → ML → /api/v4/ml/callback → salva em ml_tokens.
// Aqui: lê o token válido (renova via refresh_token quando perto de expirar).

const ML_OAUTH = "https://api.mercadolibre.com/oauth/token";
const UA = "AchadinhosBR/4.0 (+https://achadinhos-nine.vercel.app)";

type Row = {
  id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

// Supabase client (server, sessão do admin — RLS is_admin permite).
export async function obterTokenUsuario(supabase: {
  from: (t: string) => unknown;
}): Promise<string | null> {
  const db = supabase as {
    from: (t: string) => {
      select: (c: string) => {
        order: (c: string, o: { ascending: boolean }) => {
          limit: (n: number) => Promise<{ data: Row[] | null }>;
        };
      };
      update: (p: Record<string, unknown>) => { eq: (c: string, v: number) => Promise<unknown> };
    };
  };
  const { data } = await db.from("ml_tokens").select("*").order("id", { ascending: false }).limit(1);
  const row = data?.[0];
  if (!row) return null;

  // Válido com margem de 5 min? Usa direto.
  if (new Date(row.expires_at).getTime() - Date.now() > 5 * 60 * 1000) return row.access_token;

  // Renova via refresh_token (dura ~6 meses; renovações geram novo refresh).
  const clientId = (process.env.ML_CLIENT_ID || "").trim();
  const clientSecret = (process.env.ML_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) return row.access_token; // sem creds, tenta o expirado
  const res = await fetch(ML_OAUTH, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": UA },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: row.refresh_token,
    }),
    cache: "no-store",
  });
  if (!res.ok) return null; // refresh inválido/expirado → admin reconecta
  const json = await res.json();
  const access = String(json?.access_token || "");
  const refresh = String(json?.refresh_token || row.refresh_token);
  if (!access) return null;
  const expiresAt = new Date(Date.now() + Number(json?.expires_in || 21600) * 1000).toISOString();
  await db.from("ml_tokens").update({ access_token: access, refresh_token: refresh, expires_at: expiresAt }).eq("id", row.id);
  return access;
}
