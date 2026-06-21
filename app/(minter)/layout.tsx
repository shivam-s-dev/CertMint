import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { MinterSidebar } from "@/components/minter/sidebar";
import { isAdminEmail } from "@/lib/auth/admin";
import { getUserApproval } from "@/lib/auth/approval";
import { createClient } from "@/lib/supabase/server";
import { WalletConnect } from "@/components/wallet-connect";

export default async function MinterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/dashboard");
  }

  if (isAdminEmail(user.email)) {
    redirect("/admin");
  }

  const approval = await getUserApproval(user.id);
  const kycStatus = approval?.approval_status ?? "unknown";
  const role = approval?.role ?? "issuer";

  return (
    <div className="certmint-bg min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#E8D4CA] bg-white/95 px-6 py-4 backdrop-blur lg:px-8">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-[#1A1211]">Minter Dashboard</h1>
          <p className="text-xs text-[#635854]">Signed in as {user.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <WalletConnect />
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#D6BCAD] bg-white px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#362824] transition hover:bg-[#FFF8F4]"
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <MinterSidebar email={user.email ?? null} kycStatus={kycStatus} role={role} />
        <main className="flex-1 px-6 py-8 sm:px-10 lg:px-12">
          {children}
        </main>
      </div>
    </div>
  );
}
