export const metadata = { title: "Como funciona | AchadinhosBR", description: "Como funciona o AchadinhosBR e a saída para o Mercado Livre." };

export default function ComoFunciona() {
  return <div className="container"><div className="prose">
    <h1>Como funciona</h1>
    <ol>
      <li>Você navega pelas ofertas do AchadinhosBR.</li>
      <li>Clica em <strong>“Ver oferta no Mercado Livre”</strong>.</li>
      <li>Registramos esse clique (sem identificar você) para saber quais ofertas fazem sucesso.</li>
      <li>Mostramos uma <strong>página de saída</strong> com o destino claramente indicado.</li>
      <li>Você escolhe <strong>continuar para o Mercado Livre</strong> e conclui a compra lá, com total segurança.</li>
    </ol>
    <p>Nunca redirecionamos automaticamente nem escondemos o destino: você sempre sabe para onde está indo.</p>
    <p>Somos um site independente e <strong>não somos o Mercado Livre</strong>.</p>
  </div></div>;
}
