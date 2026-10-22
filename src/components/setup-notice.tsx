export function SetupNotice() {
  return (
    <div className="solo">
      <div className="box">
        <h2>Configuração pendente</h2>
        <p className="help">
          O site ainda não está ligado ao banco de dados. Faltam as variáveis
          NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
        </p>
      </div>
    </div>
  );
}
