import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const permitidos = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const email = (user.email ?? "").toLowerCase();
  if (permitidos.length > 0 && !permitidos.includes(email)) redirect("/");
  return <div className="container admin"><AdminNav />{children}</div>;
}