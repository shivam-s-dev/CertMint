import { createAdminClient } from "@/lib/supabase/admin";

export interface IssuerReputation {
  total_issued: number;
  revoked: number;
  reputation: number;
  source: "on-chain" | "database-fallback";
  issuer_address: string | null;
}

// Fetch the signing source account (Stellar address) from the transaction hash on Horizon
async function getTxSourceAccount(txHash: string): Promise<string | null> {
  try {
    const res = await fetch(`https://horizon-testnet.stellar.org/transactions/${txHash}`, {
      next: { revalidate: 300 } // cache for 5 minutes
    });
    if (res.ok) {
      const data = await res.json();
      return data.source_account || null;
    }
  } catch (err) {
    console.warn("Failed to fetch transaction from Horizon:", err);
  }
  return null;
}

export async function getIssuerReputation(
  issuerEmail: string,
  txHash: string | null
): Promise<IssuerReputation> {
  // 1. Pre-calculate the database-fallback values
  const supabase = createAdminClient();

  let totalIssued = 0;
  let revoked = 0;

  try {
    const { data: certs } = await supabase
      .from("certificates")
      .select("token_id, is_revoked")
      .eq("issuer_wallet", issuerEmail);

    if (certs) {
      totalIssued = certs.filter((c) => c.token_id !== null).length;
      revoked = certs.filter((c) => c.is_revoked === true).length;
    }
  } catch (err) {
    console.error("Failed to query database fallback for reputation:", err);
  }

  const dbReputation = 100 + totalIssued - revoked;

  // 2. Try fetching from the Stellar Soroban smart contract on-chain
  let issuerAddress: string | null = null;
  if (txHash && txHash.trim().length === 64) {
    issuerAddress = await getTxSourceAccount(txHash);
  }

  if (issuerAddress && issuerAddress.startsWith("G")) {
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

      const contractId = process.env.NEXT_PUBLIC_NFT_CONTRACT_ID;

      if (contractId && contractId !== "PLACEHOLDER") {
        const sourceAccount = await sorobanServer.getAccount(issuerAddress);
        const contract = new Contract(contractId);
        const operation = contract.call(
          "get_issuer",
          nativeToScVal(issuerAddress, { type: "address" })
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
          if (val && typeof val === "object") {
            return {
              total_issued: Number(val.total_issued ?? 0),
              revoked: Number(val.revoked ?? 0),
              reputation: Number(val.reputation ?? 100),
              source: "on-chain",
              issuer_address: issuerAddress,
            };
          }
        }
      }
    } catch (err) {
      console.warn(
        "On-chain reputation lookup failed, falling back to database metrics:",
        err instanceof Error ? err.message : err
      );
    }
  }

  return {
    total_issued: totalIssued,
    revoked: revoked,
    reputation: dbReputation,
    source: "database-fallback",
    issuer_address: issuerAddress,
  };
}
