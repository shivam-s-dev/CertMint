"use client";

import { useState } from "react";
import { useIntegration } from "@/hooks/use-integration";
import { academicApproveAction, academicRejectAction } from "@/app/(minter)/approvals/actions";
import { saveMintedCertificateAction } from "@/app/(minter)/mint/actions";

interface Certificate {
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

interface AcademicApprovalsListClientProps {
  pendingCerts: Certificate[];
  approvedCerts: Certificate[];
  role: "hod" | "registrar";
}

export function AcademicApprovalsListClient({ pendingCerts, approvedCerts, role }: AcademicApprovalsListClientProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isMinting, setIsMinting] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  const { walletAddress, connectWallet, mintCertificateTx } = useIntegration();

  async function handleApproveAndMint(cert: Certificate) {
    setIsMinting(cert.id);
    setMintError(null);

    let currentAddress = walletAddress;
    try {
      if (!currentAddress) {
        currentAddress = await connectWallet();
      }
    } catch (e) {
      console.error("Failed to connect wallet:", e);
      setMintError("Freighter wallet not connected or authorized.");
      setIsMinting(null);
      return;
    }

    if (!currentAddress) {
      setMintError("Freighter wallet connection is required to mint.");
      setIsMinting(null);
      return;
    }

    try {
      // call Freighter on-chain Soroban mint function
      const { realHash, generatedTokenId, contractId } = await mintCertificateTx(
        currentAddress,
        {
          certType: cert.cert_type || "HACKATHON",
          title: cert.title,
          description: cert.description || "",
        }
      );

      // Save to Supabase (this marks it approved and saves tx details)
      await saveMintedCertificateAction({
        certId: cert.id,
        tokenId: generatedTokenId,
        certType: cert.cert_type || "HACKATHON",
        title: cert.title,
        description: cert.description || "",
        txHash: realHash,
        contractId,
      });

      // reload
      window.location.reload();
    } catch (err: unknown) {
      console.error(err);
      setMintError(err instanceof Error ? err.message : "Minting failed.");
    } finally {
      setIsMinting(null);
    }
  }

  const certTypeLabels: Record<string, string> = {
    HACKATHON: "Hackathon",
    COURSE: "Course",
    EVENT: "Event",
    ACHIEVEMENT: "Achievement",
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-[#EAD8CF] pb-px">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === "pending"
              ? "border-[#C55B34] text-[#C55B34]"
              : "border-transparent text-[#7B6A64] hover:text-[#2D2220]"
          }`}
        >
          Pending Review ({pendingCerts.length})
        </button>

        {role === "registrar" && (
          <button
            onClick={() => setActiveTab("approved")}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${
              activeTab === "approved"
                ? "border-[#C55B34] text-[#C55B34]"
                : "border-transparent text-[#7B6A64] hover:text-[#2D2220]"
            }`}
          >
            Approved & Ready to Mint ({approvedCerts.length})
          </button>
        )}
      </div>

      {mintError && (
        <div className="rounded-xl border border-[#E7B6A0] bg-[#FFF1EA] p-4 text-sm text-[#8C3F1E]">
          ❌ {mintError}
        </div>
      )}

      {activeTab === "pending" ? (
        pendingCerts.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#E8D4CA] bg-white">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[#FFF8F4] text-xs uppercase tracking-[0.1em] text-[#7A6660]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Faculty / Creator</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EBE6]">
                {pendingCerts.map((cert) => (
                  <tr key={cert.id} className="hover:bg-[#FFFCFA]">
                    <td className="px-4 py-4">
                      <p className="font-medium text-[#1A1211]">{cert.title}</p>
                      {cert.description && (
                        <p className="mt-1 text-xs text-[#6B5A54] italic max-w-md">{cert.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-[#5A4C47] uppercase">
                      {certTypeLabels[cert.cert_type || ""] || cert.cert_type}
                    </td>
                    <td className="px-4 py-4 text-[#635854]">{cert.issuer_wallet}</td>
                    <td className="px-4 py-4 text-[#635854]">
                      {new Date(cert.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      {rejectingId === cert.id ? (
                        <div className="mt-2 space-y-2">
                          <input
                            type="text"
                            placeholder="Rejection reason..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full max-w-xs rounded-lg border border-[#DFC8BC] bg-white px-3 py-1.5 text-xs text-[#2D2220] outline-none focus:border-[#C55B34]"
                          />
                          <div className="flex gap-2">
                            <form action={academicRejectAction}>
                              <input type="hidden" name="certId" value={cert.id} />
                              <input type="hidden" name="rejectionReason" value={rejectionReason} />
                              <button
                                type="submit"
                                disabled={!rejectionReason.trim()}
                                className="rounded-lg bg-[#AA4C2F] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.05em] text-white disabled:opacity-50"
                              >
                                Submit Reject
                              </button>
                            </form>
                            <button
                              onClick={() => {
                                setRejectingId(null);
                                setRejectionReason("");
                              }}
                              className="rounded-lg border border-[#DFC8BC] bg-white px-3 py-1.5 text-xs font-semibold text-[#635854]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          {/* If Registrar, they can approve & mint directly, OR just approve */}
                          {role === "registrar" && (
                            <button
                              onClick={() => handleApproveAndMint(cert)}
                              disabled={isMinting !== null}
                              className="rounded-full border border-[#C85F37] bg-[#C85F37] px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-50 hover:bg-[#B34E27]"
                            >
                              {isMinting === cert.id ? "Minting..." : "Approve & Mint 🚀"}
                            </button>
                          )}

                          <form action={academicApproveAction}>
                            <input type="hidden" name="certId" value={cert.id} />
                            <button
                              type="submit"
                              className="rounded-full border border-[#2F7D45] bg-[#2F7D45] px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white hover:bg-[#235F33]"
                            >
                              {role === "hod" ? "Approve (Send to Registrar)" : "Approve"}
                            </button>
                          </form>

                          <button
                            onClick={() => setRejectingId(cert.id)}
                            className="rounded-full border border-[#AA4C2F] bg-white px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#AA4C2F] hover:bg-[#FFF2EE]"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E9D6CD] bg-[#FFF8F4] p-8 text-center text-sm text-[#6B5A54]">
            No certificates pending review.
          </div>
        )
      ) : approvedCerts.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-[#E8D4CA] bg-white">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[#FFF8F4] text-xs uppercase tracking-[0.1em] text-[#7A6660]">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Faculty / Creator</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EBE6]">
              {approvedCerts.map((cert) => (
                <tr key={cert.id} className="hover:bg-[#FFFCFA]">
                  <td className="px-4 py-4">
                    <p className="font-medium text-[#1A1211]">{cert.title}</p>
                    {cert.description && (
                      <p className="mt-1 text-xs text-[#6B5A54] italic max-w-md">{cert.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-xs font-semibold text-[#5A4C47] uppercase">
                    {certTypeLabels[cert.cert_type || ""] || cert.cert_type}
                  </td>
                  <td className="px-4 py-4 text-[#635854]">{cert.issuer_wallet}</td>
                  <td className="px-4 py-4 text-[#635854]">
                    {new Date(cert.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => handleApproveAndMint(cert)}
                      disabled={isMinting !== null}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#C85F37] bg-[#C85F37] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#FFF8F4] disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[#B34E27]"
                    >
                      {isMinting === cert.id ? "Minting..." : "Mint on Stellar 🚀"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E9D6CD] bg-[#FFF8F4] p-8 text-center text-sm text-[#6B5A54]">
          No approved certificates ready for minting.
        </div>
      )}
    </div>
  );
}
