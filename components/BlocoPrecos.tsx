function brl(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Bloco de histórico de preços (item 5 da spec).
// Sem histórico suficiente: avisa claramente, sem inventar preço anterior.
export default function BlocoPrecos({
  precos,
}: {
  precos: {
    atual: number | null;
    minimo: number | null;
    maximo: number | null;
    anterior: number | null;
    registros: number;
    insuficiente: boolean;
  };
}) {
  if (precos.insuficiente) {
    return <div className="notice">Histórico insuficiente para comparação.</div>;
  }
  return (
    <div className="tableWrap">
      <table className="table">
        <tbody>
          <tr><td>Preço atual</td><td><strong>{brl(precos.atual)}</strong></td></tr>
          <tr><td>Menor preço registrado</td><td>{brl(precos.minimo)}</td></tr>
          <tr><td>Maior preço registrado</td><td>{brl(precos.maximo)}</td></tr>
          <tr><td>Preço anterior</td><td>{brl(precos.anterior)}</td></tr>
          <tr><td>Registros</td><td>{precos.registros}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
