import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client privilegiado (SERVICE ROLE) — SERVER-ONLY.
// Nunca importe em componente cliente. Usado em cron/worker e rotas admin
// que precisam escrever mesmo quando o RLS da anon key bloquearia.
export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) {
    throw new Error("Supabase admin não configurado: falta SUPABASE_SERVICE_ROLE_KEY no servidor.");
  }
  const cookieStore = await cookies().catch(() => null);
  return createServerClient(url, serviceKey, {
    cookies: {
      getAll() {
        try {
          return (cookieStore as unknown as { getAll: () => { name: string; value: string }[] })?.getAll?.() ?? [];
        } catch {
          return [];
        }
      },
      setAll() {
        // Admin client não precisa persistir sessão do usuário.
      },
    },
  });
}
