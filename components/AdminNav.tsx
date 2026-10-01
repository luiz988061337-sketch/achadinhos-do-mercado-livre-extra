import Link from "next/link";

export default function AdminNav() {
  return <nav className="adminNav">
    <Link href="/admin">📊 Dashboard</Link>
    <Link href="/admin/produtos">📦 Produtos</Link>
    <Link href="/admin/produtos/novo">➕ Novo produto</Link>
    <form action="/auth/signout" method="post"><button className="secondary" type="submit">Sair</button></form>
  </nav>;
}