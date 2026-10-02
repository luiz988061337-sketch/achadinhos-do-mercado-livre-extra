import Link from "next/link";

export default function Header() {
  return (
    <>
      <div className="topbar">🔥 Ofertas garimpadas todo dia — o preço pode mudar a qualquer momento, aproveite!</div>
      <header className="header">
        <div className="container headerRow">
          <Link href="/" className="logo">🛒 Achadinhos<span>BR</span></Link>
          <form className="search" action="/ofertas" role="search">
            <input name="q" placeholder="Buscar produtos..." aria-label="Buscar produtos" />
            <button aria-label="Buscar">🔎</button>
          </form>
          <Link href="/admin" className="adminLink">Painel</Link>
        </div>
      </header>
      <nav className="nav" aria-label="Navegação principal">
        <div className="container navRow">
          <Link href="/">Início</Link>
          <Link href="/ofertas">🔥 Ofertas</Link>
          <Link href="/comparar">⚖️ Comparar</Link>
          <Link href="/categoria/casa">🏠 Casa</Link>
          <Link href="/categoria/cozinha">🍳 Cozinha</Link>
          <Link href="/categoria/eletronicos">📱 Eletrônicos</Link>
          <Link href="/categoria/moto">🏍️ Moto</Link>
          <Link href="/categoria/ferramentas">🔧 Ferramentas</Link>
        </div>
      </nav>
      <div className="ticker" aria-hidden="true"><span className="tickerInner">🔥 <b>OFERTAS ATUALIZADAS</b> &nbsp;•&nbsp; 💸 <b>DESCONTO REAL</b> &nbsp;•&nbsp; 🔒 <b>COMPRA SEGURA NO MERCADO LIVRE</b> &nbsp;•&nbsp; ⚡ <b>APROVEITE ANTES QUE O PREÇO MUDE</b> &nbsp;•&nbsp; 🔥 <b>OFERTAS ATUALIZADAS</b> &nbsp;•&nbsp; 💸 <b>DESCONTO REAL</b> &nbsp;•&nbsp; 🔒 <b>COMPRA SEGURA NO MERCADO LIVRE</b> &nbsp;•&nbsp; ⚡ <b>APROVEITE ANTES QUE O PREÇO MUDE</b> &nbsp;•&nbsp; </span></div>
    </>
  );
}