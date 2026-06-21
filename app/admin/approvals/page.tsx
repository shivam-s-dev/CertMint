import { requireAdminUser } from "@/lib/auth/admin-access";
import { ApprovalsListClient } from "@/components/admin/approvals-list-client";

export const dynamic = 'force-dynamic';

interface SearchParams {
  success?: string;
  error?: string;
}

interface ApprovalsPageProps {
  searchParams?: Promise<SearchParams>;
}

interface CertificateRow {
  id: string;
  title: string;
  description: string | null;
  cert_type: string | null;
  issuer_wallet: string;
  created_at: string;
  workflow_type: string;
  approval_status: string;
  approval_stage: string;
  rejection_reason: string | null;
}

export default async function AdminApprovalsPage({ searchParams }: ApprovalsPageProps) {
  const resolved = (await searchParams) ?? {};
  const { supabase } = await requireAdminUser();

  // Fetch pending certificates
  const { data: pendingData, error: pendingError } = await supabase
    .from("certificates")
    .select("id, title, description, cert_type, issuer_wallet, created_at, workflow_type, approval_status, approval_stage, rejection_reason")
    .eq("workflow_type", "standard")
    .eq("approval_stage", "pending_admin")
    .order("created_at", { ascending: false })
    .returns<CertificateRow[]>();

  // Fetch approved but not yet minted certificates
  const { data: approvedData, error: approvedError } = await supabase
    .from("certificates")
    .select("id, title, description, cert_type, issuer_wallet, created_at, workflow_type, approval_status, approval_stage, rejection_reason")
    .eq("workflow_type", "standard")
    .eq("approval_status", "approved")
    .is("token_id", null)
    .order("created_at", { ascending: false })
    .returns<CertificateRow[]>();

  const pendingCerts = pendingData ?? [];
  const approvedCerts = approvedData ?? [];

  return (
    <section className="space-y-5">
      <section className="rounded-[1.6rem] border border-[#EAD6CC] bg-white/90 p-6 shadow-[0_20px_50px_-35px_rgba(128,79,50,0.45)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C55B34]">Approvals</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-tight text-[#1A1211]">Certificate Approvals</h2>
        <p className="mt-2 text-sm text-[#615754]">
          Review and approve standard certificate requests before they are minted on-chain.
        </p>

        {resolved.error && (
          <p className="mt-4 rounded-xl border border-[#E7B6A0] bg-[#FFF1EA] px-4 py-3 text-sm text-[#8C3F1E]">
            {resolved.error}
          </p>
        )}

        {resolved.success && (
          <p className="mt-4 rounded-xl border border-[#B9D9C0] bg-[#EFFAF1] px-4 py-3 text-sm text-[#1A6A31]">
            {resolved.success}
          </p>
        )}

        {(pendingError || approvedError) && (
          <p className="mt-4 rounded-xl border border-[#E7B6A0] bg-[#FFF1EA] px-4 py-3 text-sm text-[#8C3F1E]">
            Failed to load certificate requests. Please verify database columns.
          </p>
        )}

        <div className="mt-6">
          <ApprovalsListClient pendingCerts={pendingCerts} approvedCerts={approvedCerts} />
        </div>
      </section>
    </section>
  );
}
