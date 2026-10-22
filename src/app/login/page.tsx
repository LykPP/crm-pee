import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

// Depends on the signed-in user, so it is rendered on every request.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { erro } = await searchParams;
  return (
    <div className="solo">
      <div className="box">
        <div className="stack" style={{ gap: 10 }}>
          <Logo height={44} />
          <h1>Painel PEE</h1>
          <p className="help">Entre com o seu e-mail de trabalho.</p>
        </div>
        <LoginForm linkError={erro === "link"} />
      </div>
    </div>
  );
}
