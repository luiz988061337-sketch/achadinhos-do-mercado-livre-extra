import Link from "next/link";

export default function AdminNav() {
  return <nav className="adminNav">
    <Link href="/admin">📊 Dashboard</Link>
    <Link href="/admin/produtos">📦 Produtos</Link>
    <Link href="/admin/produtos/novo">➕ Novo produto</Link>
    <Link href="/admin/anuncios">📣 Central de Anúncios</Link>
    <Link href="/admin/v4">🆕 V4 Marketplaces</Link>
    <Link href="/admin/v4/pesquisar">🔎 V4 Pesquisar</Link>
    <Link href="/admin/v4/pendentes">✅ V4 Aprovação</Link>
    <Link href="/admin/v4/whatsapp">💬 V4 WhatsApp</Link>
    <Link href="/admin/ofertas">🏷️ Ofertas V3</Link>
    <Link href="/admin/v3">📊 Dashboard V3</Link>
    <Link href="/admin/distribuicao">📣 Distribuição</Link>
    <form action="/auth/signout" method="post"><button className="secondary" type="submit">Sair</button></form>
  </nav>;
}