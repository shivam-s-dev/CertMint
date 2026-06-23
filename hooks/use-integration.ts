"use client";

import { useState, useCallback } from "react";
import { isAllowed, setAllowed, requestAccess, signTransaction } from "@stellar/freighter-api";
import { Networks, TransactionBuilder, Contract, nativeToScVal } from "@stellar/stellar-sdk";

export function extractAddress(result: unknown): string | null {
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && "address" in result) {
    const addr = (result as { address: unknown }).address;
    if (typeof addr === "string" && addr.length > 0) return addr;
  }
  return null;
}

export type BalanceResult =
  | { status: "ok"; amount: string }
  | { status: "unfunded" }
  | { status: "error" };

export async function fetchXlmBalance(address: string): Promise<BalanceResult> {
  try {
    const res = await fetch(
      `https://horizon-testnet.stellar.org/accounts/${address}`,
      { cache: "no-store" }
    );
    if (res.status === 404) return { status: "unfunded" };
    if (!res.ok) return { status: "error" };
    const data = await res.json();
    const nativeBalance = (
      data.balances as { asset_type: string; balance: string }[]
    ).find((b) => b.asset_type === "native");
    const amount = nativeBalance
      ? parseFloat(nativeBalance.balance).toFixed(2)
      : "0.00";
    return { status: "ok", amount };
  } catch {
    return { status: "error" };
  }
}

export function useIntegration() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const connectWallet = useCallback(async () => {
    try {
      if (await isAllowed()) {
        const access = await requestAccess();
        const addr = extractAddress(access);
        if (addr) setWalletAddress(addr);
        return addr;
      } else {
        await setAllowed();
        const access = await requestAccess();
        const addr = extractAddress(access);
        if (addr) setWalletAddress(addr);
        return addr;
      }
    } catch (e) {
      console.error(e);
      throw new Error("Freighter connection rejected or not installed.");
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
  }, []);

  const mintCertificateTx = useCallback(async (
    currentAddress: string,
    form: { certType: string; title: string; description: string; }
  ) => {
    const { rpc: SorobanRpc, Transaction } = await import("@stellar/stellar-sdk");
    const sorobanServer = new SorobanRpc.Server(
      process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org"
    );

    const contractId = process.env.NEXT_PUBLIC_NFT_CONTRACT_ID || "PLACEHOLDER";
    if (contractId === "PLACEHOLDER") throw new Error("NFT Contract ID not configured.");

    const sourceAccount = await sorobanServer.getAccount(currentAddress);
    const generatedTokenId = Math.floor(100000 + Math.random() * 900000);

    const contract = new Contract(contractId);
    const operation = contract.call(
      "mint",
      nativeToScVal(currentAddress, { type: "address" }),
      nativeToScVal(generatedTokenId, { type: "u64" }),
      nativeToScVal(form.certType, { type: "symbol" }),
      nativeToScVal(form.title, { type: "string" })
    );

    const tx = new TransactionBuilder(sourceAccount, {
      fee: "300",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(60)
      .build();

    const simulation = await sorobanServer.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simulation)) {
      throw new Error(`Contract simulation failed: ${simulation.error}`);
    }

    const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();

    const signResult = await signTransaction(preparedTx.toXDR(), {
      networkPassphrase: Networks.TESTNET,
    });
    
    if (typeof signResult === "object" && "error" in signResult) {
      throw new Error((signResult as { error?: string }).error || "User declined to sign the transaction.");
    }
    
    const signedXdr =
      typeof signResult === "string"
        ? signResult
        : (signResult as { signedTxXdr: string }).signedTxXdr;

    const submitResponse = await sorobanServer.sendTransaction(
      new Transaction(signedXdr, Networks.TESTNET)
    );

    if (submitResponse.status === "ERROR") {
      throw new Error(`On-chain submission failed: ${String(submitResponse.errorResult)}`);
    }

    const realHash = submitResponse.hash;
    let attempts = 0;
    while (attempts < 8) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await sorobanServer.getTransaction(realHash);
      if (poll.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) break;
      if (poll.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
        let errorMsg = "Transaction failed on-chain.";
        if (poll.resultMetaXdr) {
          errorMsg += " Check Stellar Explorer for detailed contract execution error.";
        }
        throw new Error(errorMsg);
      }
      attempts++;
    }

    return { realHash, generatedTokenId, contractId };
  }, []);

  const endorseCertificateTx = useCallback(async (
    currentAddress: string,
    tokenId: number
  ) => {
    const { rpc: SorobanRpc, Transaction } = await import("@stellar/stellar-sdk");
    const sorobanServer = new SorobanRpc.Server(
      process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org"
    );

    const contractId = process.env.NEXT_PUBLIC_NFT_CONTRACT_ID || "PLACEHOLDER";
    if (contractId === "PLACEHOLDER") throw new Error("NFT Contract ID not configured.");

    const sourceAccount = await sorobanServer.getAccount(currentAddress);

    const contract = new Contract(contractId);
    const operation = contract.call(
      "endorse_certificate",
      nativeToScVal(tokenId, { type: "u64" }),
      nativeToScVal(currentAddress, { type: "address" })
    );

    const tx = new TransactionBuilder(sourceAccount, {
      fee: "300",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(60)
      .build();

    const simulation = await sorobanServer.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simulation)) {
      throw new Error(`Contract simulation failed: ${simulation.error}`);
    }

    const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();

    const signResult = await signTransaction(preparedTx.toXDR(), {
      networkPassphrase: Networks.TESTNET,
    });
    
    if (typeof signResult === "object" && "error" in signResult) {
      throw new Error((signResult as { error?: string }).error || "User declined to sign the transaction.");
    }
    
    const signedXdr =
      typeof signResult === "string"
        ? signResult
        : (signResult as { signedTxXdr: string }).signedTxXdr;

    const submitResponse = await sorobanServer.sendTransaction(
      new Transaction(signedXdr, Networks.TESTNET)
    );

    if (submitResponse.status === "ERROR") {
      throw new Error(`On-chain submission failed: ${String(submitResponse.errorResult)}`);
    }

    const realHash = submitResponse.hash;
    let attempts = 0;
    while (attempts < 8) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await sorobanServer.getTransaction(realHash);
      if (poll.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) break;
      if (poll.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
        let errorMsg = "Transaction failed on-chain.";
        if (poll.resultMetaXdr) {
          errorMsg += " Check Stellar Explorer for detailed contract execution error.";
        }
        throw new Error(errorMsg);
      }
      attempts++;
    }

    return { realHash };
  }, []);

  return {
    walletAddress,
    setWalletAddress,
    connectWallet,
    disconnectWallet,
    mintCertificateTx,
    endorseCertificateTx
  };
}
