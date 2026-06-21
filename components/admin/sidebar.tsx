import Link from "next/link";

const adminNavItems = [
  { label: "Overview", href: "/admin" },
  { label: "Certs", href: "/admin/certs" },
  { label: "Approvals", href: "/admin/approvals" },
  { label: "Wallets", href: "/admin/wallets" },
  { label: "Txns", href: "/admin/txns" },
  { label: "Logs", href: "/admin/logs" },
];

export function AdminSidebar() {
  return (
    <aside className="w-full shrink-0 border-b border-[#E7D4CA] bg-white/85 p-5 lg:w-64 lg:border-b-0 lg:border-r lg:bg-transparent lg:p-6">
      <nav className="grid gap-2">
        {adminNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-[#E6D3C8] bg-white px-4 py-3 text-sm font-semibold text-[#342723] transition hover:border-[#CFAF9F] hover:bg-[#FFF7F2]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
