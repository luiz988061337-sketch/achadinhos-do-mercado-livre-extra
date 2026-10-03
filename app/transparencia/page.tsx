import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transparência | AchadinhosBR",
  description:
    "Como o AchadinhosBR usa links de afiliado e o que isso significa para você.",
  alternates: { canonical: "/transparencia" },
};

export default function TransparenciaPage() {
  return (
    <div className="container">
      <h1>Transparência</h1>
      <p>
        Alguns links publicados pelo AchadinhosBR são links de afiliado. Podemos receber uma
        comissão quando uma compra elegível é realizada através desses links. Isso{" "}
        <strong>não aumenta o preço pago pelo usuário</strong>.
      </p>
      <h2>Como funciona</h2>
      <ul>
        <li>Mostramos o preço e as condições que encontramos no momento da publicação.</li>
        <li>Os preços e condições podem mudar no Mercado Livre — sempre confira na página oficial.</li>
        <li>Você sempre sai do nosso site por um botão claro (“IR PARA A OFERTA”).</li>
        <li>O “score” exibido é uma métrica interna do AchadinhosBR e não garante o menor preço do mercado.</li>
      </ul>
      <h2>Sua privacidade</h2>
      <ul>
        <li>Registramos cliques e visualizações para medir quais ofertas funcionam (sem dados pessoais).</li>
        <li>Não guardamos IP original (só um código anônimo) nem dados sensíveis.</li>
      </ul>
    </div>
  );
}
