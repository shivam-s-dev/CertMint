import { redirect } from "next/navigation";
import { getUserApproval } from "@/lib/auth/approval";
import { createClient } from "@/lib/supabase/server";
import { AcademicApprovalsListClient } from "@/components/minter/academic-approvals-list-client";

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

export default async function ApprovalsPage({ searchParams }: ApprovalsPageProps) {
  const resolved = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/approvals");
  }

  const approval = await getUserApproval(user.id);
  const role = approval?.role;

  if (role !== "hod" && role !== "registrar") {
    redirect("/dashboard?error=Access+denied.+Reviewers+only.");
  }

  let pendingCerts: CertificateRow[] = [];
  let approvedCerts: CertificateRow[] = [];
  let errorLoading = false;

  try {
    if (role === "hod") {
      const { data, error } = await supabase
        .from("certificates")
        .select("id, title, description, cert_type, issuer_wallet, created_at, workflow_type, approval_status, approval_stage, rejection_reason")
        .eq("workflow_type", "academic")
        .eq("approval_stage", "pending_hod")
        .order("created_at", { ascending: false })
        .returns<CertificateRow[]>();

      if (error) throw error;
      pendingCerts = data ?? [];
    } else if (role === "registrar") {
      // Pending registrar review
      const { data: pendingData, error: pendingError } = await supabase
        .from("certificates")
        .select("id, title, description, cert_type, issuer_wallet, created_at, workflow_type, approval_status, approval_stage, rejection_reason")
        .eq("workflow_type", "academic")
        .eq("approval_stage", "pending_registrar")
        .order("created_at", { ascending: false })
        .returns<CertificateRow[]>();

      if (pendingError) throw pendingError;
      pendingCerts = pendingData ?? [];

      // Registrar approved but not yet minted
      const { data: approvedData, error: approvedError } = await supabase
        .from("certificates")
        .select("id, title, description, cert_type, issuer_wallet, created_at, workflow_type, approval_status, approval_stage, rejection_reason")
        .eq("workflow_type", "academic")
        .eq("approval_status", "approved")
        .is("token_id", null)
        .order("created_at", { ascending: false })
        .returns<CertificateRow[]>();

      if (approvedError) throw approvedError;
      approvedCerts = approvedData ?? [];
    }
  } catch (err) {
    console.error("Error loading certificates:", err);
    errorLoading = true;
  }

  const roleLabels = {
    hod: "Head of Department (HOD)",
    registrar: "University Registrar",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-[1.6rem] border border-[#EAD6CC] bg-white/90 p-6 shadow-[0_20px_50px_-35px_rgba(128,79,50,0.45)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C55B34]">Reviewer Portal</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[#1A1211]">
          {roleLabels[role]} Dashboard
        </h1>
        <p className="mt-3 text-sm leading-7 text-[#5D5452] sm:text-base">
          Review pending certificate requests submitted by faculty members and authorize them.
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

        {errorLoading && (
          <p className="mt-4 rounded-xl border border-[#E7B6A0] bg-[#FFF1EA] px-4 py-3 text-sm text-[#8C3F1E]">
            Failed to load certificate approval lists. Please make sure schema changes are applied.
          </p>
        )}

        <div className="mt-8">
          <AcademicApprovalsListClient pendingCerts={pendingCerts} approvedCerts={approvedCerts} role={role} />
        </div>
      </section>
    </div>
  );
}
