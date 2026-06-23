import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIssuerReputation } from "@/lib/reputation";
import { getCertificateEndorsements } from "@/lib/endorsements";
import { EndorsementsPanel } from "@/components/endorsements-panel";

export const dynamic = 'force-dynamic';

export default async function CertificateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const tokenId = parseInt(resolvedParams.id, 10);
  
  if (isNaN(tokenId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: certificate } = await supabase
    .from("certificates")
    .select("*")
    .eq("token_id", tokenId)
    .eq("approval_status", "approved")
    .single();

  if (!certificate) {
    notFound();
  }

  const reputationInfo = await getIssuerReputation(
    certificate.issuer_wallet,
    certificate.tx_hash
  );

  const endorsements = await getCertificateEndorsements(
    tokenId,
    certificate.tx_hash
  );
  
  let emojiBadge = "📄";
  if (certificate.cert_type === "HACKATHON") emojiBadge = "🏆";
  if (certificate.cert_type === "COURSE") emojiBadge = "🎓";
  if (certificate.cert_type === "ACHIEVEMENT") emojiBadge = "⭐";

  const walletPreview = certificate.owner_wallet.length > 8 
    ? `${certificate.owner_wallet.substring(0, 4)}...${certificate.owner_wallet.substring(certificate.owner_wallet.length - 4)}`
    : certificate.owner_wallet;

  return (
    <main className="certmint-bg min-h-screen px-6 py-12 sm:px-10 lg:px-16">
      <section className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] border border-[#EBD8CF] bg-white/90 p-8 shadow-[0_24px_52px_-34px_rgba(143,88,59,0.5)] backdrop-blur sm:p-12">
          
          <div className="relative rounded-2xl border-2 border-[#EAD8CF] bg-[#FFFBF9] p-8 text-center sm:p-12">
            <div className="absolute inset-x-0 top-0 flex justify-center -mt-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#EAD8CF] bg-white text-2xl shadow-sm">
                {emojiBadge}
              </span>
            </div>
            
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#C55B34]">{certificate.cert_type}</p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-[#1A1211] sm:text-4xl">
              {certificate.title}
            </h1>
            
            <div className="mt-8 space-y-3 text-sm text-[#5D5452]">
              <p>
                <span className="text-[#866E65]">Wallet:</span> <strong className="text-[#2D2220] font-mono font-medium">{walletPreview}</strong>
              </p>
              <p>
                <span className="text-[#866E65]">Token ID:</span> <strong className="text-[#2D2220] font-medium">#{certificate.token_id}</strong>
              </p>
              <p>
                <span className="text-[#866E65]">Issued:</span> <strong className="text-[#2D2220] font-medium">{new Date(certificate.created_at).toLocaleDateString()}</strong>
              </p>
              {certificate.description && (
                <p className="pt-2 italic text-[#6B5A54] max-w-md mx-auto">{certificate.description}</p>
              )}
            </div>
            
            {certificate.is_revoked ? (
              <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-[#E7B6A0] bg-[#FFF1EA] px-5 py-2 text-sm font-medium text-[#8C3F1E]">
                ❌ Certificate Revoked
              </div>
            ) : (
              <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-[#B9D9C0] bg-[#EFFAF1] px-5 py-2 text-sm font-medium text-[#1A6A31]">
                ✅ Verified on Stellar Testnet
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#D6BCAD] bg-white px-5 text-sm font-semibold text-[#362824] transition hover:bg-[#FFF8F4]">
              <span>📋</span> Copy Link
            </button>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#D6BCAD] bg-white px-5 text-sm font-semibold text-[#362824] transition hover:bg-[#FFF8F4]">
              <span>🐦</span> Share
            </button>
          </div>

          <div className="mt-10">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-semibold text-[#866E65] uppercase tracking-[0.1em]">QR Code</span>
              <div className="h-px flex-1 bg-[#EFDED5]"></div>
            </div>
            <div className="flex items-center gap-6 rounded-2xl border border-[#EAD8CF] bg-[#FFFBF9] p-5">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-white border border-[#EBD8CF]">
              {/* Static QR-like pattern — stable across renders */}
              <div className="grid grid-cols-5 grid-rows-5 gap-0.5 p-2 w-full h-full">
                {[1,0,1,1,0,0,1,0,1,1,1,1,0,0,1,0,1,1,0,1,1,0,1,0,1].map((on, i) => (
                  <div key={i} className={`bg-[#2D2220] ${on ? "opacity-100" : "opacity-0"}`}></div>
                ))}
              </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#2D2220]">Scan to verify this</p>
                <p className="text-sm text-[#5D5452]">certificate on-chain</p>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-semibold text-[#866E65] uppercase tracking-[0.1em]">Issuer Reputation</span>
              <div className="h-px flex-1 bg-[#EFDED5]"></div>
            </div>
            <div className="rounded-2xl border border-[#EAD8CF] bg-[#FFFBF9] p-5 space-y-3 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-[#866E65]">Issuer Email:</span>
                <span className="text-[#2D2220] font-medium">{certificate.issuer_wallet}</span>
              </div>
              {reputationInfo.issuer_address && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#866E65]">Issuer Wallet:</span>
                  <span className="font-mono text-[#2D2220]">{`${reputationInfo.issuer_address.slice(0, 6)}...${reputationInfo.issuer_address.slice(-6)}`}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1">
                <span className="text-[#866E65]">Reputation Score:</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#1A6A31] font-bold text-base">{reputationInfo.reputation}</span>
                  {reputationInfo.reputation >= 95 && (
                    <span className="rounded bg-[#EFFAF1] border border-[#B9D9C0] px-1.5 py-0.5 text-[10px] font-bold text-[#1A6A31]">Trusted Issuer ⭐</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EAD8CF] text-xs text-[#6B5A54]">
                <p>Issued count: <strong>{reputationInfo.total_issued}</strong></p>
                <p>Revoked count: <strong>{reputationInfo.revoked}</strong></p>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-semibold text-[#866E65] uppercase tracking-[0.1em]">Endorsements</span>
              <div className="h-px flex-1 bg-[#EFDED5]"></div>
            </div>
            <EndorsementsPanel
              tokenId={tokenId}
              initialEndorsements={endorsements}
              issuerWallet={certificate.issuer_wallet}
            />
          </div>

          <div className="mt-10">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-semibold text-[#866E65] uppercase tracking-[0.1em]">On-chain Details</span>
              <div className="h-px flex-1 bg-[#EFDED5]"></div>
            </div>
            <div className="rounded-2xl border border-[#EAD8CF] bg-white p-5 space-y-3 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-[#866E65]">Contract:</span>
                <span className="font-mono text-[#2D2220]">{certificate.contract_id || 'Pending...'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#866E65]">TX Hash:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[#2D2220]">{certificate.tx_hash ? `${certificate.tx_hash.substring(0, 8)}...` : 'Pending...'}</span>
                  {certificate.tx_hash && (
                    <Link href={`https://stellar.expert/explorer/testnet/tx/${certificate.tx_hash}`} target="_blank" className="text-[#C55B34] hover:underline flex items-center gap-1">
                      Explorer ↗
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#866E65]">Owner:</span>
                <span className="font-mono text-[#2D2220]">{walletPreview}</span>
              </div>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
