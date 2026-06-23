"use client";

import { useState } from "react";
import { useIntegration } from "@/hooks/use-integration";
import { endorseCertificateAction, saveFreighterEndorsementAction } from "@/app/actions/endorsements";

export interface EndorsementInfo {
  endorser_name: string;
  endorser_wallet: string;
  tx_hash: string | null;
  is_on_chain: boolean;
}

interface EndorsementsPanelProps {
  tokenId: number;
  initialEndorsements: EndorsementInfo[];
  issuerWallet: string;
}

const PUBLIC_ENDORSERS = {
  techverse: "GBB2OLTRIQAXMLPWNNUME3P334TIFKXMT4SHJ3FEME7EESQPXL6TZAU6",
  mentor: "GAQIFC7VYW64VS3IJBRTG3BAF62VTHNERPSVSZQVOQQXA4C35SU7PO6I",
  organization: "GCWNWDRJOQ7QZS4GQ3IKCBGLS3QFVPX6YFJYOZPHLFMGT564RRE2U6W3"
};

export function EndorsementsPanel({ tokenId, initialEndorsements, issuerWallet }: EndorsementsPanelProps) {
  const [endorsements, setEndorsements] = useState<EndorsementInfo[]>(initialEndorsements);
  const [loadingEndorser, setLoadingEndorser] = useState<'techverse' | 'mentor' | 'organization' | 'freighter' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { walletAddress, connectWallet, endorseCertificateTx } = useIntegration();

  // Helper to check if a specific address has endorsed
  const getEndorsement = (wallet: string) => endorsements.find(e => e.endorser_wallet === wallet);

  async function handleSimulatedEndorse(type: 'techverse' | 'mentor' | 'organization') {
    setLoadingEndorser(type);
    setErrorMsg(null);

    try {
      const res = await endorseCertificateAction(tokenId, type);
      if (res.success) {
        const nameMap = {
          techverse: "TechVerse",
          mentor: "Mentor",
          organization: "Organization"
        };
        const newEndorsement: EndorsementInfo = {
          endorser_name: nameMap[type],
          endorser_wallet: PUBLIC_ENDORSERS[type],
          tx_hash: res.txHash,
          is_on_chain: true
        };
        setEndorsements(prev => [...prev, newEndorsement]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || `Failed to endorse as ${type}.`);
    } finally {
      setLoadingEndorser(null);
    }
  }

  async function handleFreighterEndorse() {
    setLoadingEndorser('freighter');
    setErrorMsg(null);

    try {
      let currentAddress = walletAddress;
      if (!currentAddress) {
        currentAddress = await connectWallet();
      }
      if (!currentAddress) {
        throw new Error("Freighter wallet connection required.");
      }

      // Check if already endorsed
      if (getEndorsement(currentAddress)) {
        throw new Error("You have already endorsed this certificate.");
      }

      // 1. Submit transaction on-chain via Freighter
      const { realHash } = await endorseCertificateTx(currentAddress, tokenId);

      // 2. Save endorsement details in Supabase
      await saveFreighterEndorsementAction(tokenId, currentAddress, realHash);

      // 3. Update local state
      const newEndorsement: EndorsementInfo = {
        endorser_name: "External Endorser",
        endorser_wallet: currentAddress,
        tx_hash: realHash,
        is_on_chain: true
      };
      setEndorsements(prev => [...prev, newEndorsement]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to endorse with Freighter.");
    } finally {
      setLoadingEndorser(null);
    }
  }

  const score = endorsements.length;

  return (
    <div className="rounded-2xl border border-[#EAD8CF] bg-[#FFFBF9] p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#EFDED5]">
        <div>
          <h3 className="font-semibold text-lg text-[#2D2220] flex items-center gap-2">
            On-Chain Endorsements <span className="text-[#C55B34] text-sm">⭐⭐⭐⭐⭐</span>
          </h3>
          <p className="text-xs text-[#866E65] mt-0.5">Stellar-native verification and social proof</p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#C55B34]/10 px-3 py-1 text-xs font-bold text-[#C55B34] border border-[#C55B34]/20 self-start sm:self-auto">
          Score: {score} {score === 1 ? 'Endorsement' : 'Endorsements'}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-[#E7B6A0] bg-[#FFF1EA] px-4 py-3 text-xs text-[#8C3F1E]">
          ❌ {errorMsg}
        </div>
      )}

      {/* Verification / Endorsers Checklist */}
      <div className="space-y-4">
        {/* Minter / Issuer */}
        <div className="flex items-start gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EFFAF1] text-xs font-bold text-[#1A6A31] border border-[#B9D9C0] mt-0.5">
            ✓
          </span>
          <div className="text-sm">
            <p className="font-semibold text-[#2D2220]">Issued by Organization</p>
            <p className="text-xs text-[#866E65] font-mono break-all mt-0.5">{issuerWallet}</p>
          </div>
        </div>

        {/* TechVerse */}
        <div className="flex items-start justify-between gap-4 pt-3 border-t border-[#F5EBE6]">
          <div className="flex items-start gap-3">
            {getEndorsement(PUBLIC_ENDORSERS.techverse) ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EFFAF1] text-xs font-bold text-[#1A6A31] border border-[#B9D9C0] mt-0.5">
                ✓
              </span>
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F5EBE6] text-xs font-bold text-[#A69792] border border-[#EAD8CF] mt-0.5">
                •
              </span>
            )}
            <div className="text-sm">
              <p className="font-semibold text-[#2D2220]">Endorsed by TechVerse</p>
              {getEndorsement(PUBLIC_ENDORSERS.techverse) ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-[#1A6A31] font-bold uppercase bg-[#EFFAF1] border border-[#B9D9C0] px-1 py-0.2 rounded">On-Chain</span>
                  {getEndorsement(PUBLIC_ENDORSERS.techverse)?.tx_hash && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${getEndorsement(PUBLIC_ENDORSERS.techverse)?.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-semibold text-[#C55B34] hover:underline"
                    >
                      Verify Tx ↗
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#866E65] mt-0.5 font-mono">{PUBLIC_ENDORSERS.techverse.substring(0, 6)}...{PUBLIC_ENDORSERS.techverse.substring(PUBLIC_ENDORSERS.techverse.length - 6)}</p>
              )}
            </div>
          </div>
          {!getEndorsement(PUBLIC_ENDORSERS.techverse) && (
            <button
              onClick={() => handleSimulatedEndorse('techverse')}
              disabled={loadingEndorser !== null}
              className="text-xs font-semibold text-[#C55B34] border border-[#C55B34]/30 hover:border-[#C55B34] hover:bg-[#C55B34]/5 px-3 py-1.5 rounded-full transition disabled:opacity-50"
            >
              {loadingEndorser === 'techverse' ? 'Signing...' : 'Endorse'}
            </button>
          )}
        </div>

        {/* Mentor */}
        <div className="flex items-start justify-between gap-4 pt-3 border-t border-[#F5EBE6]">
          <div className="flex items-start gap-3">
            {getEndorsement(PUBLIC_ENDORSERS.mentor) ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EFFAF1] text-xs font-bold text-[#1A6A31] border border-[#B9D9C0] mt-0.5">
                ✓
              </span>
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F5EBE6] text-xs font-bold text-[#A69792] border border-[#EAD8CF] mt-0.5">
                •
              </span>
            )}
            <div className="text-sm">
              <p className="font-semibold text-[#2D2220]">Endorsed by Mentor</p>
              {getEndorsement(PUBLIC_ENDORSERS.mentor) ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-[#1A6A31] font-bold uppercase bg-[#EFFAF1] border border-[#B9D9C0] px-1 py-0.2 rounded">On-Chain</span>
                  {getEndorsement(PUBLIC_ENDORSERS.mentor)?.tx_hash && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${getEndorsement(PUBLIC_ENDORSERS.mentor)?.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-semibold text-[#C55B34] hover:underline"
                    >
                      Verify Tx ↗
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#866E65] mt-0.5 font-mono">{PUBLIC_ENDORSERS.mentor.substring(0, 6)}...{PUBLIC_ENDORSERS.mentor.substring(PUBLIC_ENDORSERS.mentor.length - 6)}</p>
              )}
            </div>
          </div>
          {!getEndorsement(PUBLIC_ENDORSERS.mentor) && (
            <button
              onClick={() => handleSimulatedEndorse('mentor')}
              disabled={loadingEndorser !== null}
              className="text-xs font-semibold text-[#C55B34] border border-[#C55B34]/30 hover:border-[#C55B34] hover:bg-[#C55B34]/5 px-3 py-1.5 rounded-full transition disabled:opacity-50"
            >
              {loadingEndorser === 'mentor' ? 'Signing...' : 'Endorse'}
            </button>
          )}
        </div>

        {/* Organization */}
        <div className="flex items-start justify-between gap-4 pt-3 border-t border-[#F5EBE6]">
          <div className="flex items-start gap-3">
            {getEndorsement(PUBLIC_ENDORSERS.organization) ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EFFAF1] text-xs font-bold text-[#1A6A31] border border-[#B9D9C0] mt-0.5">
                ✓
              </span>
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F5EBE6] text-xs font-bold text-[#A69792] border border-[#EAD8CF] mt-0.5">
                •
              </span>
            )}
            <div className="text-sm">
              <p className="font-semibold text-[#2D2220]">Endorsed by Sponsoring Org</p>
              {getEndorsement(PUBLIC_ENDORSERS.organization) ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-[#1A6A31] font-bold uppercase bg-[#EFFAF1] border border-[#B9D9C0] px-1 py-0.2 rounded">On-Chain</span>
                  {getEndorsement(PUBLIC_ENDORSERS.organization)?.tx_hash && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${getEndorsement(PUBLIC_ENDORSERS.organization)?.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-semibold text-[#C55B34] hover:underline"
                    >
                      Verify Tx ↗
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#866E65] mt-0.5 font-mono">{PUBLIC_ENDORSERS.organization.substring(0, 6)}...{PUBLIC_ENDORSERS.organization.substring(PUBLIC_ENDORSERS.organization.length - 6)}</p>
              )}
            </div>
          </div>
          {!getEndorsement(PUBLIC_ENDORSERS.organization) && (
            <button
              onClick={() => handleSimulatedEndorse('organization')}
              disabled={loadingEndorser !== null}
              className="text-xs font-semibold text-[#C55B34] border border-[#C55B34]/30 hover:border-[#C55B34] hover:bg-[#C55B34]/5 px-3 py-1.5 rounded-full transition disabled:opacity-50"
            >
              {loadingEndorser === 'organization' ? 'Signing...' : 'Endorse'}
            </button>
          )}
        </div>

        {/* User Freighter Wallet */}
        <div className="flex flex-col gap-2 pt-4 border-t border-[#EFDED5]">
          <p className="text-xs font-semibold text-[#5A4C47] uppercase tracking-[0.06em]">Your Community Endorsement</p>
          <div className="flex items-center justify-between gap-4">
            {walletAddress && getEndorsement(walletAddress) ? (
              <div className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EFFAF1] text-xs font-bold text-[#1A6A31] border border-[#B9D9C0] mt-0.5">
                  ✓
                </span>
                <div className="text-sm">
                  <p className="font-semibold text-[#2D2220]">You endorsed this</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[#1A6A31] font-bold uppercase bg-[#EFFAF1] border border-[#B9D9C0] px-1 py-0.2 rounded font-mono">On-Chain</span>
                    {getEndorsement(walletAddress)?.tx_hash && (
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${getEndorsement(walletAddress)?.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-semibold text-[#C55B34] hover:underline"
                      >
                        Verify Tx ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#6B5A54] leading-normal">
                  Endorse this certificate using your connected Freighter wallet.
                </p>
                <button
                  onClick={handleFreighterEndorse}
                  disabled={loadingEndorser !== null}
                  className="text-xs font-semibold text-[#FFF8F4] bg-[#C55B34] hover:bg-[#AD4E2A] px-4 py-2 rounded-full transition disabled:opacity-60 whitespace-nowrap"
                >
                  {loadingEndorser === 'freighter' ? 'Confirming...' : 'Endorse with Freighter 🚀'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
