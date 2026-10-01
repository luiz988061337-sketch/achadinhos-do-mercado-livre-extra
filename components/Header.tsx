import Link from "next/link";

export default function Header() {
  return (
    <>
      <div className="topbar">Ofertas e achadinhos selecionados todos os dias</div>
      <header className="header">
        <div className="container headerRow">
          <Link href="/" className="logo">🛒 Achadinhos<span>BR</span></Link>
          <form className="search" action="/ofertas">
            <input name="q" placeholder="Buscar produtos..." />
            <button aria-label="Buscar">🔎</button>
          </form>
          <Link href="/admin" className="adminLink">Painel</Link>
        </div>
      </header>
      <nav className="nav">
        <div className="container navRow">
          <Link href="/">Início</Link>
          <Link href="/ofertas">🔥 Ofertas</Link>
          <Link href="/categoria/casa">🏠 Casa</Link>
          <Link href="/categoria/cozinha">🍳 Cozinha</Link>
          <Link href="/categoria/eletronicos">📱 Eletrônicos</Link>
          <Link href="/categoria/moto">🏍️ Moto</Link>
          <Link href="/categoria/ferramentas">🔧 Ferramentas</Link>
        </div>
      </nav>
    </>
  );
}