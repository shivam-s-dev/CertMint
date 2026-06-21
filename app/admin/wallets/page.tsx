import Link from "next/link";
import { updateApprovalStatusAction, updateUserRoleAction } from "@/app/admin/actions";
import { requireAdminUser } from "@/lib/auth/admin-access";

export const dynamic = 'force-dynamic';

type ApprovalStatus = "pending" | "approved" | "rejected";
type ViewStatus = ApprovalStatus | "all";

interface UserProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  approval_status: ApprovalStatus;
  created_at: string;
}

interface SearchParams {
  success?: string;
  error?: string;
  status?: string;
}

interface WalletsPageProps {
  searchParams?: Promise<SearchParams>;
}

export default async function AdminWalletsPage({ searchParams }: WalletsPageProps) {
  const resolved = (await searchParams) ?? {};
  const selectedStatus: ViewStatus =
    resolved.status === "approved" || resolved.status === "rejected" || resolved.status === "all"
      ? resolved.status
      : "pending";

  const { supabase, effectiveEmail } = await requireAdminUser();

  let usersQuery = supabase
    .from("user_profiles")
    .select("id, email, full_name, role, approval_status, created_at")
    .neq("email", effectiveEmail) // Exclude the admin user themselves
    .order("created_at", { ascending: false });

  if (selectedStatus !== "all") {
    usersQuery = usersQuery.eq("approval_status", selectedStatus);
  }

  const { data: users, error: usersError } = await usersQuery.returns<UserProfileRow[]>();

  return (
    <section className="space-y-5">
      <section className="rounded-[1.6rem] border border-[#EAD6CC] bg-white/90 p-6 shadow-[0_20px_50px_-35px_rgba(128,79,50,0.45)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C55B34]">Wallets</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-tight text-[#1A1211]">KYC approval queue</h2>
        <p className="mt-2 text-sm text-[#615754]">Review minter KYC status and grant minting access.</p>

        {resolved.error ? (
          <p className="mt-4 rounded-xl border border-[#E7B6A0] bg-[#FFF1EA] px-4 py-3 text-sm text-[#8C3F1E]">{resolved.error}</p>
        ) : null}

        {resolved.success ? (
          <p className="mt-4 rounded-xl border border-[#B9D9C0] bg-[#EFFAF1] px-4 py-3 text-sm text-[#1A6A31]">{resolved.success}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/wallets?status=pending"
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] ${
              selectedStatus === "pending"
                ? "border-[#C75F38] bg-[#C75F38] text-[#FFF8F4]"
                : "border-[#D9C0B2] bg-white text-[#3A2D29]"
            }`}
          >
            Pending
          </Link>
          <Link
            href="/admin/wallets?status=approved"
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] ${
              selectedStatus === "approved"
                ? "border-[#C75F38] bg-[#C75F38] text-[#FFF8F4]"
                : "border-[#D9C0B2] bg-white text-[#3A2D29]"
            }`}
          >
            Approved
          </Link>
          <Link
            href="/admin/wallets?status=rejected"
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] ${
              selectedStatus === "rejected"
                ? "border-[#C75F38] bg-[#C75F38] text-[#FFF8F4]"
                : "border-[#D9C0B2] bg-white text-[#3A2D29]"
            }`}
          >
            Rejected
          </Link>
          <Link
            href="/admin/wallets?status=all"
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] ${
              selectedStatus === "all"
                ? "border-[#C75F38] bg-[#C75F38] text-[#FFF8F4]"
                : "border-[#D9C0B2] bg-white text-[#3A2D29]"
            }`}
          >
            All
          </Link>
        </div>

        {usersError ? (
          <p className="mt-4 rounded-xl border border-[#E7B6A0] bg-[#FFF1EA] px-4 py-3 text-sm text-[#8C3F1E]">
            Failed to load users. Check SQL setup and permissions.
          </p>
        ) : null}

        {users && users.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#EAD8CF] text-xs uppercase tracking-[0.1em] text-[#7B6A64]">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((profile) => (
                  <tr key={profile.id} className="border-b border-[#F1E4DD] text-[#2C211D]">
                    <td className="px-3 py-3">{profile.full_name ?? "-"}</td>
                    <td className="px-3 py-3">{profile.email}</td>
                    <td className="px-3 py-3 uppercase">{profile.role}</td>
                    <td className="px-3 py-3 uppercase">{profile.approval_status}</td>
                    <td className="px-3 py-3">{new Date(profile.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {profile.approval_status !== "approved" ? (
                          <form action={updateApprovalStatusAction}>
                            <input type="hidden" name="userId" value={profile.id} />
                            <input type="hidden" name="status" value="approved" />
                            <input type="hidden" name="viewStatus" value={selectedStatus} />
                            <button
                              type="submit"
                              className="rounded-full border border-[#2F7D45] bg-[#2F7D45] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white"
                            >
                              Approve
                            </button>
                          </form>
                        ) : null}

                        {profile.approval_status !== "rejected" ? (
                          <form action={updateApprovalStatusAction}>
                            <input type="hidden" name="userId" value={profile.id} />
                            <input type="hidden" name="status" value="rejected" />
                            <input type="hidden" name="viewStatus" value={selectedStatus} />
                            <button
                              type="submit"
                              className="rounded-full border border-[#AA4C2F] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#AA4C2F]"
                            >
                              Reject
                            </button>
                          </form>
                        ) : null}

                        {profile.approval_status !== "pending" ? (
                          <form action={updateApprovalStatusAction}>
                            <input type="hidden" name="userId" value={profile.id} />
                            <input type="hidden" name="status" value="pending" />
                            <input type="hidden" name="viewStatus" value={selectedStatus} />
                            <button
                              type="submit"
                              className="rounded-full border border-[#8A6E60] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#6B5850]"
                            >
                              Mark Pending
                            </button>
                          </form>
                        ) : null}
                      </div>

                      <div className="mt-3 border-t border-[#F1E4DD] pt-2">
                        <form action={updateUserRoleAction} className="flex flex-wrap items-center gap-1.5">
                          <input type="hidden" name="userId" value={profile.id} />
                          <input type="hidden" name="viewStatus" value={selectedStatus} />
                          <select
                            name="role"
                            defaultValue={profile.role}
                            className="rounded-lg border border-[#DFC8BC] bg-white px-2 py-1 text-xs text-[#2D2220] outline-none"
                          >
                            <option value="issuer">Issuer (Faculty)</option>
                            <option value="hod">HOD</option>
                            <option value="registrar">Registrar</option>
                          </select>
                          <button
                            type="submit"
                            className="rounded-lg border border-[#C55B34] bg-white px-2.5 py-1 text-xs font-semibold text-[#C55B34] transition hover:bg-[#FFF7F2]"
                          >
                            Set Role
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-[#E9D6CD] bg-[#FFF8F4] px-4 py-6 text-sm text-[#645955]">
            No users found for this status.
          </p>
        )}
      </section>
    </section>
  );
}
