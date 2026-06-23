import { Keypair } from "@stellar/stellar-sdk";
import { createAdminClient } from "@/lib/supabase/admin";

export const ENDORSER_METADATA = {
  techverse: { name: "TechVerse", role: "TechVerse Platform" },
  mentor: { name: "Mentor", role: "Industry Mentor" },
  organization: { name: "Organization", role: "Sponsoring Organization" }
};

export function getEndorserKeypair(type: 'techverse' | 'mentor' | 'organization'): Keypair {
  const seeds = {
    techverse: Buffer.alloc(32, 10),
    mentor: Buffer.alloc(32, 20),
    organization: Buffer.alloc(32, 30),
  };
  return Keypair.fromRawEd25519Seed(seeds[type]);
}

export function getEndorserNameByAddress(address: string): string | null {
  if (address === getEndorserKeypair('techverse').publicKey()) return "TechVerse";
  if (address === getEndorserKeypair('mentor').publicKey()) return "Mentor";
  if (address === getEndorserKeypair('organization').publicKey()) return "Organization";
  return null;
}

export interface EndorsementInfo {
  endorser_name: string;
  endorser_wallet: string;
  tx_hash: string | null;
  is_on_chain: boolean;
}

export async function getCertificateEndorsements(
  tokenId: number,
  txHash: string | null
): Promise<EndorsementInfo[]> {
  const supabase = createAdminClient();

  // 1. Fetch from database first
  let dbEndorsements: any[] = [];
  try {
    const { data, error } = await supabase
      .from("endorsements")
      .select("*")
      .eq("token_id", tokenId);
    if (!error && data) {
      dbEndorsements = data;
    }
  } catch (err) {
    console.warn("DB endorsements fetch failed, table might not exist yet:", err);
  }

  // 2. Fetch on-chain if contracts are configured and we have transaction hash
  const onChainAddresses: string[] = [];
  let nftContractId = process.env.NEXT_PUBLIC_NFT_CONTRACT_ID;
  if (nftContractId === "PLACEHOLDER") nftContractId = undefined;

  if (nftContractId) {
    try {
      const {
        rpc: SorobanRpc,
        TransactionBuilder,
        Contract,
        nativeToScVal,
        scValToNative,
        Networks,
      } = await import("@stellar/stellar-sdk");

      const sorobanServer = new SorobanRpc.Server(
        process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org"
      );

      // We need a source account for simulation. We can use the admin wallet or the endorser wallet
      const mockSource = process.env.ADMIN_WALLET_ADDRESS || getEndorserKeypair('techverse').publicKey();
      const sourceAccount = await sorobanServer.getAccount(mockSource);
      const contract = new Contract(nftContractId);
      const operation = contract.call(
        "get_endorsements",
        nativeToScVal(tokenId, { type: "u64" })
      );

      const tx = new TransactionBuilder(sourceAccount, {
        fee: "100",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simulation = await sorobanServer.simulateTransaction(tx);
      
      if (!SorobanRpc.Api.isSimulationError(simulation) && simulation.result) {
        const val = scValToNative(simulation.result.retval);
        if (Array.isArray(val)) {
          for (const addr of val) {
            if (typeof addr === "string") {
              onChainAddresses.push(addr);
            }
          }
        }
      }
    } catch (err) {
      console.warn("On-chain endorsements lookup failed:", err);
    }
  }

  // 3. Merge DB and on-chain records
  const result: EndorsementInfo[] = [];

  // Add DB endorsements
  for (const dbE of dbEndorsements) {
    result.push({
      endorser_name: dbE.endorser_name,
      endorser_wallet: dbE.endorser_wallet,
      tx_hash: dbE.tx_hash,
      is_on_chain: onChainAddresses.includes(dbE.endorser_wallet),
    });
  }

  // Check if there are on-chain endorsements not in DB (e.g. direct calls)
  const techverseAddr = getEndorserKeypair('techverse').publicKey();
  const mentorAddr = getEndorserKeypair('mentor').publicKey();
  const orgAddr = getEndorserKeypair('organization').publicKey();

  for (const addr of onChainAddresses) {
    const alreadyAdded = result.some((r) => r.endorser_wallet === addr);
    if (!alreadyAdded) {
      let name = "External Endorser";
      if (addr === techverseAddr) name = "TechVerse";
      else if (addr === mentorAddr) name = "Mentor";
      else if (addr === orgAddr) name = "Organization";
      else {
        name = `${addr.substring(0, 4)}...${addr.substring(addr.length - 4)}`;
      }

      result.push({
        endorser_name: name,
        endorser_wallet: addr,
        tx_hash: null,
        is_on_chain: true,
      });
    }
  }

  return result;
}
