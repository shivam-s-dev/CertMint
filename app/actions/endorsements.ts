"use server";

import { getEndorserKeypair, ENDORSER_METADATA } from "@/lib/endorsements";
import { createAdminClient } from "@/lib/supabase/admin";

export async function endorseCertificateAction(
  tokenId: number,
  endorserType: 'techverse' | 'mentor' | 'organization'
) {
  const supabase = createAdminClient();

  // 1. Find the certificate ID
  const { data: cert, error: certErr } = await supabase
    .from("certificates")
    .select("id")
    .eq("token_id", tokenId)
    .single();

  if (certErr || !cert) {
    throw new Error("Certificate not found in database.");
  }

  const keypair = getEndorserKeypair(endorserType);
  const publicKey = keypair.publicKey();
  const contractId = process.env.NEXT_PUBLIC_NFT_CONTRACT_ID;
  if (!contractId || contractId === "PLACEHOLDER") {
    throw new Error("NFT contract ID is not configured.");
  }

  const { rpc: SorobanRpc, TransactionBuilder, Contract, nativeToScVal, Networks } = await import("@stellar/stellar-sdk");
  const sorobanServer = new SorobanRpc.Server(
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org"
  );

  // 2. Fund the endorser account if it doesn't exist on testnet
  try {
    const accountRes = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
    if (accountRes.status === 404) {
      console.log(`Funding ${endorserType} account ${publicKey} on testnet...`);
      const fundRes = await fetch(`https://friendbot.stellar.org/?addr=${publicKey}`);
      if (!fundRes.ok) {
        throw new Error(`Failed to fund endorser account via Friendbot: ${fundRes.statusText}`);
      }
      // Wait for ledger close (3 seconds)
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } catch (err) {
    console.warn(`Friendbot funding check/call failed for ${endorserType}:`, err);
  }

  // 3. Build, sign, and submit the endorse transaction on-chain
  let txHash = "";
  try {
    const sourceAccount = await sorobanServer.getAccount(publicKey);
    const contract = new Contract(contractId);
    const operation = contract.call(
      "endorse_certificate",
      nativeToScVal(tokenId, { type: "u64" }),
      nativeToScVal(publicKey, { type: "address" })
    );

    const tx = new TransactionBuilder(sourceAccount, {
      fee: "500",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(60)
      .build();

    tx.sign(keypair);

    const submitResponse = await sorobanServer.sendTransaction(tx);
    if (submitResponse.status === "ERROR") {
      throw new Error(`On-chain endorsement failed: ${String(submitResponse.errorResult)}`);
    }

    txHash = submitResponse.hash;

    // Poll for status
    let attempts = 0;
    let succeeded = false;
    while (attempts < 10) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await sorobanServer.getTransaction(txHash);
      if (poll.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
        succeeded = true;
        break;
      }
      if (poll.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
        throw new Error("Transaction failed on-chain.");
      }
      attempts++;
    }

    if (!succeeded) {
      throw new Error("Transaction submission timed out.");
    }
  } catch (err: any) {
    console.error("Blockchain endorsement failed:", err);
    throw new Error(`Blockchain error: ${err.message || err}`);
  }

  // 4. Save the endorsement to the database
  try {
    const metadata = ENDORSER_METADATA[endorserType];
    const { error: insertErr } = await supabase
      .from("endorsements")
      .insert({
        cert_id: cert.id,
        token_id: tokenId,
        endorser_wallet: publicKey,
        endorser_name: metadata.name,
        tx_hash: txHash,
      });

    if (insertErr) {
      console.error("Database insert error:", insertErr);
      throw new Error(`Database error: ${insertErr.message}`);
    }
  } catch (dbErr: any) {
    console.error("Supabase insert failed:", dbErr);
    throw dbErr;
  }

  return { success: true, txHash };
}

export async function saveFreighterEndorsementAction(
  tokenId: number,
  endorserWallet: string,
  txHash: string
) {
  const supabase = createAdminClient();

  const { data: cert, error: certErr } = await supabase
    .from("certificates")
    .select("id")
    .eq("token_id", tokenId)
    .single();

  if (certErr || !cert) {
    throw new Error("Certificate not found in database.");
  }

  const { error: insertErr } = await supabase
    .from("endorsements")
    .insert({
      cert_id: cert.id,
      token_id: tokenId,
      endorser_wallet: endorserWallet,
      endorser_name: "External Endorser",
      tx_hash: txHash,
    });

  if (insertErr) {
    console.error("Database insert error for Freighter endorsement:", insertErr);
    throw new Error(`Database error: ${insertErr.message}`);
  }

  return { success: true };
}
