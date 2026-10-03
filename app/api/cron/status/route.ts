import { NextResponse } from "next/server";
import { exigirAdmin, ehErroResponse } from "@/lib/v4-guard";

// GET /api/cron/status — diagnóstico do WhatsApp + automação (só admin).
// Retorna apenas booleanos (nunca valores de segredo).
export async function GET() {
  try {
    await exigirAdmin();
  } catch (e) {
    if (ehErroResponse(e)) return e;
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  return NextResponse.json({
    cron_secret: Boolean(process.env.CRON_SECRET),
    service_role: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_anon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    whatsapp_token: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
    whatsapp_phone_id: Boolean(process.env.WHATSAPP_PHONE_ID),
    whatsapp_test_to: Boolean(process.env.WHATSAPP_TEST_TO),
    ml_client: Boolean(process.env.ML_CLIENT_ID && process.env.ML_CLIENT_SECRET),
    shopee: Boolean(process.env.SHOPEE_APP_ID && process.env.SHOPEE_APP_SECRET),
    cron_termos: Boolean((process.env.CRON_TERMOS || "").trim()),
    auto_publish: (process.env.ALLOW_AUTO_PUBLISH || "").toLowerCase() === "true",
    vercel_cron: true,
    nota: "WhatsApp envia SOMENTE pela API oficial. Cron Vercel 9h pesquisar + 9h30 preços.",
  });
}
