export const metadata = { title: "Política de Privacidade | AchadinhosBR", description: "Como tratamos dados no AchadinhosBR." };

export default function Privacidade() {
  return <div className="container"><div className="prose">
    <h1>Política de Privacidade</h1>
    <p><strong>O que coletamos:</strong> ao clicar em uma oferta, registramos dados mínimos e anônimos — produto clicado, data/hora, página de origem, canal de origem e um identificador anônimo de sessão. Não coletamos nome, e-mail, endereço ou dados de pagamento.</p>
    <p><strong>IP:</strong> não guardamos o IP original; armazenamos no máximo uma versão embaralhada (hash) para contagem aproximada, nunca para identificar alguém.</p>
    <p><strong>Para que serve:</strong> saber quais ofertas e canais geram mais interesse e melhorar a curadoria. Não vendemos dados nem exibimos anúncios de terceiros com seus dados.</p>
    <p><strong>Cookies:</strong> usamos apenas cookies próprios e funcionais (sessão anônima e login administrativo).</p>
    <p><strong>Links externos:</strong> ao sair para o Mercado Livre, valem as políticas de privacidade de lá.</p>
  </div></div>;
}
