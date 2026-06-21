"use client";

import { useState } from "react";
import { useIntegration } from "@/hooks/use-integration";
import { saveMintedCertificateAction } from "@/app/(minter)/mint/actions";

interface Certificate {
  id: string;
  token_id: number | null;
  cert_type: string | null;
  title: string | null;
  description: string | null;
  owner_wallet: string | null;
  is_revoked: boolean;
  workflow_type: string;
  approval_status: string;
  approval_stage: string;
  rejection_reason: string | null;
  created_at: string;
}

interface ManageMintedClientProps {
  mintedCerts: Certificate[];
  requests: Certificate[];
}

export function ManageMintedClient({ mintedCerts, requests }: ManageMintedClientProps) {
  const [activeTab, setActiveTab] = useState<"minted" | "requests">("minted");
  const [isMinting, setIsMinting] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  const { walletAddress, connectWallet, mintCertificateTx } = useIntegration();

  async function handleMint(cert: Certificate) {
    setIsMinting(cert.id);
    setMintError(null);

    let currentAddress = walletAddress;
    try {
      if (!currentAddress) {
        currentAddress = await connectWallet();
      }
    } catch (e) {
      console.error("Wallet connection failed:", e);
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
      // Call Freighter on-chain Soroban mint transaction
      const { realHash, generatedTokenId, contractId } = await mintCertificateTx(
        currentAddress,
        {
          certType: cert.cert_type || "HACKATHON",
          title: cert.title || "",
          description: cert.description || "",
        }
      );

      // Save to Supabase (updating the existing record with token ID & tx hash)
      await saveMintedCertificateAction({
        certId: cert.id,
        tokenId: generatedTokenId,
        certType: cert.cert_type || "HACKATHON",
        title: cert.title || "",
        description: cert.description || "",
        txHash: realHash,
        contractId,
      });

      // Reload page to reflect updates
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setMintError(err.message || "Minting transaction failed.");
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

  const stageLabels: Record<string, string> = {
    pending_admin: "Pending Admin Approval",
    pending_hod: "Pending HOD Approval",
    pending_registrar: "Pending Registrar Approval",
    approved: "Approved & Ready to Mint",
    rejected: "Rejected",
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-[#EAD8CF] pb-px">
        <button
          onClick={() => setActiveTab("minted")}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === "minted"
              ? "border-[#C55B34] text-[#C55B34]"
              : "border-transparent text-[#7B6A64] hover:text-[#2D2220]"
          }`}
        >
          Minted Certificates ({mintedCerts.length})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === "requests"
              ? "border-[#C55B34] text-[#C55B34]"
              : "border-transparent text-[#7B6A64] hover:text-[#2D2220]"
          }`}
        >
          Approval Requests ({requests.length})
        </button>
      </div>

      {mintError && (
        <div className="rounded-xl border border-[#E7B6A0] bg-[#FFF1EA] p-4 text-sm text-[#8C3F1E]">
          ❌ {mintError}
        </div>
      )}

      {activeTab === "minted" ? (
        mintedCerts.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#E8D4CA] bg-white">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[#FFF8F4] text-xs uppercase tracking-[0.1em] text-[#7A6660]">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Issued Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EBE6]">
                {mintedCerts.map((cert) => (
                  <tr key={cert.id} className="hover:bg-[#FFFCFA]">
                    <td className="px-4 py-4 text-sm font-mono text-[#2D2220]">#{cert.token_id}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#1A1211]">{cert.title}</p>
                      {cert.description && (
                        <p className="mt-1 text-xs text-[#6B5A54] italic max-w-md">{cert.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[#5A4C47] font-semibold text-xs uppercase">
                      {certTypeLabels[cert.cert_type || ""] || cert.cert_type}
                    </td>
                    <td className="px-4 py-4">
                      {cert.is_revoked ? (
                        <span className="rounded-md bg-[#FFF1EA] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#A54527]">
                          Revoked
                        </span>
                      ) : (
                        <span className="rounded-md bg-[#EFFAF1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1A6A31]">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[#635854]">
                      {new Date(cert.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E9D6CD] bg-[#FFF8F4] p-8 text-center text-sm text-[#6B5A54]">
            You have not minted any certificates yet.
          </div>
        )
      ) : requests.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-[#E8D4CA] bg-white">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[#FFF8F4] text-xs uppercase tracking-[0.1em] text-[#7A6660]">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Workflow</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 font-semibold">Action / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EBE6]">
              {requests.map((cert) => {
                const isApproved = cert.approval_status === "approved" && cert.approval_stage === "approved";
                const isRejected = cert.approval_status === "rejected";

                return (
                  <tr key={cert.id} className="hover:bg-[#FFFCFA]">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#1A1211]">{cert.title}</p>
                      {cert.description && (
                        <p className="mt-1 text-xs text-[#6B5A54] italic max-w-md">{cert.description}</p>
                      )}
                      {isRejected && cert.rejection_reason && (
                        <p className="mt-2 text-xs text-[#AA4C2F] font-medium bg-[#FFF1EA] border border-[#E7B6A0] rounded-lg px-2.5 py-1.5 inline-block">
                          Reason: {cert.rejection_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[#5A4C47] text-xs font-semibold uppercase">
                      {certTypeLabels[cert.cert_type || ""] || cert.cert_type}
                    </td>
                    <td className="px-4 py-4 text-xs font-medium text-[#635854] capitalize">
                      {cert.workflow_type}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded px-2.5 py-1 text-xs font-semibold ${
                          isApproved
                            ? "bg-[#EFFAF1] text-[#1A6A31]"
                            : isRejected
                              ? "bg-[#FFF1EA] text-[#AA4C2F]"
                              : "bg-[#FFF8F4] text-[#866E65]"
                        }`}
                      >
                        {stageLabels[cert.approval_stage] || cert.approval_stage}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {isApproved ? (
                        <button
                          onClick={() => handleMint(cert)}
                          disabled={isMinting !== null}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#C85F37] bg-[#C85F37] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#FFF8F4] disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[#B34E27]"
                        >
                          {isMinting === cert.id ? (
                            <>
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Minting...
                            </>
                          ) : (
                            "Mint 🚀"
                          )}
                        </button>
                      ) : isRejected ? (
                        <span className="text-xs font-bold uppercase tracking-wider text-[#AA4C2F]">
                          Rejected
                        </span>
                      ) : (
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#7A6660]">
                          Pending Approval
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E9D6CD] bg-[#FFF8F4] p-8 text-center text-sm text-[#6B5A54]">
          No approval requests found.
        </div>
      )}
    </div>
  );
}
