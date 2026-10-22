export function ComingSoon({ title, step }: { title: string; step: string }) {
  return (
    <>
      <div className="head">
        <div>
          <h1>{title}</h1>
          <p>Esta tela ainda está em construção.</p>
        </div>
      </div>
      <div className="box">
        <p className="help">Previsão: {step} do plano da Fase 1.</p>
      </div>
    </>
  );
}
