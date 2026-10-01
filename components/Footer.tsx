import Link from "next/link";

export default function Footer() {
  return <footer className="footer"><div className="container footerGrid">
    <div><h3>🛒 AchadinhosBR</h3><p>Ofertas e produtos selecionados para facilitar suas compras.</p><p>Site independente, sem vínculo com o Mercado Livre.</p></div>
    <div><h3>Site</h3><p><Link href="/ofertas">Ofertas</Link></p><p><Link href="/como-funciona">Como funciona</Link></p><p><Link href="/sobre">Sobre</Link></p><p><Link href="/contato">Contato</Link></p></div>
    <div><h3>Transparência</h3><p><Link href="/afiliados">Aviso de afiliado</Link></p><p><Link href="/privacidade">Privacidade</Link></p><p><Link href="/termos">Termos de uso</Link></p></div>
  </div></footer>;
}
