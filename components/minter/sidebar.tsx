import Link from "next/link";

interface SidebarProps {
  email: string | null;
  kycStatus: "pending" | "approved" | "rejected" | "unknown";
  role: string;
}

const navItems = [
  { label: "Home", href: "/dashboard" },
  { label: "Mint Certificate", href: "/mint" },
  { label: "Manage Minted Certificate", href: "/manage-minted" },
  { label: "Profile and Settings", href: "/profile-settings" },
];

function kycBadgeClasses(status: SidebarProps["kycStatus"]) {
  if (status === "approved") {
    return "border-[#9FD0AA] bg-[#ECFAF0] text-[#1A6A31]";
  }

  if (status === "rejected") {
    return "border-[#E7B6A0] bg-[#FFF1EA] text-[#8C3F1E]";
  }

  return "border-[#E9D6CD] bg-[#FFF8F4] text-[#5A4C47]";
}

export function MinterSidebar({ kycStatus, role }: SidebarProps) {
  const currentNavItems = [...navItems];
  if (role === "hod" || role === "registrar") {
    currentNavItems.push({ label: "Approvals Queue", href: "/approvals" });
  }

  return (
    <aside className="w-full shrink-0 border-b border-[#E7D4CA] bg-white/85 p-5 lg:w-72 lg:border-b-0 lg:border-r lg:bg-transparent lg:p-6">
      <nav className="grid gap-2">
        {currentNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-[#E6D3C8] bg-white px-4 py-3 text-sm font-semibold text-[#342723] transition hover:border-[#CFAF9F] hover:bg-[#FFF7F2]"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 rounded-xl border border-[#E9D6CD] bg-[#FFF8F4] p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-[#866E65]">KYC status</p>
        <p className={`mt-1 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${kycBadgeClasses(kycStatus)}`}>
          {kycStatus}
        </p>
      </div>
    </aside>
  );
}
