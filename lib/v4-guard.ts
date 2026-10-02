// Guard de admin para Route Handlers V4 (server-only).
// Usa sessão do usuário (anon key) + tabela admin_users (is_admin) ou ADMIN_EMAILS como fallback.
import { createClient } from "@/lib/supabase/server";

export async function exigirAdmin(): Promise<{ userId: string; email: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Response("Não autenticado.", { status: 401 });

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (admin) return { userId: user.id, email: user.email ?? "" };

  const permitidos = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const email = (user.email ?? "").toLowerCase();
  if (permitidos.length > 0 && permitidos.includes(email)) return { userId: user.id, email };

  // Sem registro em admin_users e sem e-mail permitido → bloqueia.
  throw new Response("Acesso restrito ao administrador.", { status: 403 });
}

export function ehErroResponse(e: unknown): e is Response {
  return e instanceof Response;
}
