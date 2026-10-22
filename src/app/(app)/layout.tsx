import { SideNav } from "@/components/side-nav";
import { SetupNotice } from "@/components/setup-notice";
import { signOut } from "@/app/auth/actions";
import { ROLE_LABELS, requireMembership } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Depends on the signed-in user, so it is rendered on every request.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { user, org, role } = await requireMembership();

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <b>Painel PEE</b>
          <span>{org.name}</span>
        </div>
        <SideNav />
        <div className="foot keep">
          <div className="who">
            <b>{user.email}</b>
            <span>{ROLE_LABELS[role]}</span>
          </div>
          <form action={signOut}>
            <button type="submit" className="btn ghost">
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className="main">
        <div className="wrap">{children}</div>
      </main>
    </div>
  );
}
