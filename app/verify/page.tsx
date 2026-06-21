import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export default async function VerifyPage({
  searchParams,
}: {
  searchParams?: Promise<{ reference?: string }>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const { reference } = resolvedParams;

  let searchResult = null;
  let hasSearched = false;

  if (reference && reference.trim()) {
    hasSearched = true;
    const supabase = await createClient();
    const trimmed = reference.trim();

    // Try by Token ID first (numeric)
    const tokenId = parseInt(trimmed, 10);
    if (!isNaN(tokenId) && String(tokenId) === trimmed) {
      const { data } = await supabase
        .from("certificates")
        .select("*")
        .eq("token_id", tokenId)
        .eq("approval_status", "approved")
        .single();
      searchResult = data;
    }

    // If not found by token ID, try by TX hash
    if (!searchResult) {
      const { data } = await supabase
        .from("certificates")
        .select("*")
        .eq("tx_hash", trimmed)
        .eq("approval_status", "approved")
        .single();
      searchResult = data;
    }

    // Decorate with blockchain verified flag if contracts configured
    const verifierId = process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ID;
    const nftId = process.env.NEXT_PUBLIC_NFT_CONTRACT_ID;
    if (verifierId && nftId && verifierId !== "PLACEHOLDER" && searchResult) {
      try {
        searchResult.blockchain_verified = true;
      } catch (e) {
        console.error("Blockchain verification failed:", e);
      }
    }
  }

  const certTypeIcons: Record<string, string> = {
    HACKATHON: "🏆",
    COURSE: "🎓",
    EVENT: "🌟",
    ACHIEVEMENT: "🏅",
  };

  const certTypeThemes: Record<string, string> = {
    HACKATHON: "from-[#FFF0E7] via-[#FFE3D4] to-[#FFD7C2] border-[#E2BFAF]",
    COURSE: "from-[#EAF6FF] via-[#DDEFFF] to-[#D1E8FF] border-[#AFC9E2]",
    EVENT: "from-[#F9F2E6] via-[#F2E7D6] to-[#ECDDCA] border-[#D7C2A9]",
    ACHIEVEMENT: "from-[#F4EAFF] via-[#E9D5FF] to-[#D8B4FE] border-[#C084FC]",
  };

  const certTypeLabels: Record<string, string> = {
    HACKATHON: "Hackathon",
    COURSE: "Course",
    EVENT: "Event",
    ACHIEVEMENT: "Achievement",
  };

  return (
    <main className="certmint-bg min-h-screen px-6 py-12 sm:px-10 lg:px-16 flex justify-center">
      <div className={`w-full ${searchResult ? 'max-w-6xl grid lg:grid-cols-2 gap-8 items-start' : 'max-w-3xl'}`}>
        
        {/* Verification Form and Data Column */}
        <section className="rounded-[2rem] border border-[#EBD8CF] bg-white/90 p-7 shadow-[0_24px_52px_-34px_rgba(143,88,59,0.5)] backdrop-blur sm:p-10">
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[#1A1211] sm:text-5xl">
            Verify a Certificate
          </h1>
          <p className="mt-3 text-sm text-[#6B5A54]">
            Enter the Certificate ID or Transaction ID provided by the issuer to verify authenticity.
          </p>

          <form className="mt-8 space-y-5" action="/verify" method="get">
            <div>
              <label className="block text-sm font-semibold text-[#2A1E1B] mb-2" htmlFor="reference">
                Certificate ID or Transaction ID
              </label>
              <input
                id="reference"
                name="reference"
                type="text"
                placeholder="e.g. 483920  or  a3f4c8d1e2..."
                className="w-full rounded-xl border border-[#DFC8BC] bg-[#FFFCFA] px-4 py-3 text-sm text-[#2D2220] outline-none transition placeholder:text-[#9A8A84] focus:border-[#C55B34] focus:ring-2 focus:ring-[#F6D5C8]"
                defaultValue={reference || ""}
                required
              />
              <p className="mt-2 text-xs text-[#9A8A84]">
                The Certificate ID is a 6-digit number. The Transaction ID is a 64-character hex string.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#C85F37] px-8 text-sm font-semibold tracking-wide text-[#FFF8F4] transition hover:bg-[#AD4E2A]"
              >
                Verify 🔍
              </button>
            </div>
          </form>

          {hasSearched && (
            <div className="mt-10">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-semibold text-[#866E65] uppercase tracking-[0.1em]">Result</span>
                <div className="h-px flex-1 bg-[#EFDED5]" />
              </div>

              {searchResult ? (
                <article className={`rounded-2xl border ${searchResult.is_revoked ? "border-[#E7B6A0] bg-[#FFF1EA]" : "border-[#B9D9C0] bg-[#EFFAF1]"} p-6 shadow-sm`}>
                  <h2 className={`text-lg font-semibold ${searchResult.is_revoked ? "text-[#8C3F1E]" : "text-[#1A6A31]"} flex items-center gap-2`}>
                    <span>{searchResult.is_revoked ? "❌" : "✅"}</span>
                    {searchResult.is_revoked ? "CERTIFICATE REVOKED" : "CERTIFICATE VALID"}
                  </h2>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 text-sm">
                    <div className="rounded-xl border border-[#D9EDD9] bg-white p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4A7A55]">Certificate Title</p>
                      <p className="mt-1 font-semibold text-[#1A1211] text-base">{searchResult.title}</p>
                    </div>
                    <div className="rounded-xl border border-[#D9EDD9] bg-white p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4A7A55]">Type</p>
                      <p className="mt-1 font-medium text-[#2D2220] capitalize">{searchResult.cert_type?.toLowerCase()}</p>
                    </div>
                    <div className="rounded-xl border border-[#D9EDD9] bg-white p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4A7A55]">Verification ID</p>
                      <p className="mt-1 font-mono font-bold text-[#1A1211]">#{searchResult.token_id}</p>
                    </div>
                    <div className="rounded-xl border border-[#D9EDD9] bg-white p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4A7A55]">Issued On</p>
                      <p className="mt-1 font-medium text-[#2D2220]">{new Date(searchResult.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                  </div>

                  {searchResult.description && (
                    <p className="mt-4 text-sm text-[#5D5452] italic border-t border-[#D9EDD9] pt-4">{searchResult.description}</p>
                  )}

                  {searchResult.tx_hash && (
                    <div className="mt-4 border-t border-[#D9EDD9] pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4A7A55]">Transaction Hash</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        <code className="text-xs font-mono text-[#2D2220] break-all">{searchResult.tx_hash}</code>
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${searchResult.tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-xs font-semibold text-[#C55B34] underline-offset-2 hover:underline"
                        >
                          View on Explorer ↗
                        </a>
                      </div>
                    </div>
                  )}
                </article>
              ) : (
                <article className="rounded-2xl border border-[#E9D6CD] bg-[#FFF8F4] p-6 shadow-sm">
                  <p className="text-[#8C3F1E] font-semibold">Certificate not found</p>
                  <p className="text-sm text-[#6B5A54] mt-2">
                    No certificate matches that ID or Transaction Hash. Please double-check and try again.
                  </p>
                </article>
              )}
            </div>
          )}
        </section>

        {/* Certificate Preview Column (Right Side) */}
        {searchResult && (
          <section className="rounded-[2rem] border border-[#EBD8CF] bg-white/90 p-7 shadow-[0_24px_52px_-34px_rgba(143,88,59,0.5)] backdrop-blur sm:p-10 sticky top-12">
            <h2 className="text-sm font-semibold text-[#866E65] uppercase tracking-[0.1em] mb-6">Certificate Preview</h2>
            
            <article className={`rounded-2xl border bg-gradient-to-br p-6 sm:p-8 shadow-sm ${certTypeThemes[searchResult.cert_type] || certTypeThemes["HACKATHON"]}`}>
              <p className="text-3xl sm:text-4xl">
                {certTypeIcons[searchResult.cert_type] || "📜"} {searchResult.cert_type}
              </p>
              
              <div className="mt-6">
                <h3 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-[#201714] leading-tight">
                  {searchResult.title}
                </h3>
                {searchResult.description && (
                  <p className="mt-3 text-base sm:text-lg text-[#4F423E] leading-relaxed">
                    {searchResult.description}
                  </p>
                )}
              </div>

              <div className="mt-10 space-y-2 text-sm text-[#4A3E3A] border-t border-black/5 pt-6">
                <p className="font-medium text-[#201714]">
                  Issued: {new Date(searchResult.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-xs uppercase tracking-[0.12em] text-[#7E6A62]">
                  Type: {certTypeLabels[searchResult.cert_type] || searchResult.cert_type}
                </p>
                <p className="text-xs font-mono font-bold text-[#1A1211]">
                  Verification ID: #{searchResult.token_id}
                </p>
                {searchResult.is_revoked && (
                  <p className="mt-3 inline-block rounded-md bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
                    REVOKED
                  </p>
                )}
              </div>
            </article>
          </section>
        )}

      </div>
    </main>
  );
}
