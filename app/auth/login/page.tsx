 "use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email,setEmail] = useState("");
  const [senha,setSenha] = useState("");
  const [erro,setErro] = useState("");
  const [loading,setLoading] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault(); setLoading(true); setErro("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) { setErro(error.message); setLoading(false); return; }
    router.push("/admin");
    router.refresh();
  }

  return <div className="auth"><form className="authBox" onSubmit={entrar}><h1>🔐 Entrar</h1><p>Painel administrativo</p>{erro && <div className="error">{erro}</div>}<div className="field"><label>E-mail</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div><br/><div className="field"><label>Senha</label><input type="password" value={senha} onChange={e=>setSenha(e.target.value)} required /></div><button className="bigButton" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button></form></div>;
}