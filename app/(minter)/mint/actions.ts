"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveMintedCertificateAction(payload: {
  certId?: string; // If provided, update the existing record
  tokenId: number;
  certType: string;
  title: string;
  description: string;
  txHash: string;
  contractId: string;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized: please sign in.");
  }

  let dbError;
  let finalId = payload.certId;

  if (payload.certId) {
    // Update existing approved certificate
    const { error } = await supabase
      .from("certificates")
      .update({
        token_id: payload.tokenId,
        tx_hash: payload.txHash,
        contract_id: payload.contractId,
        approval_status: "approved",
        approval_stage: "approved",
      })
      .eq("id", payload.certId);
    dbError = error;
  } else {
    // Insert new certificate directly (e.g. for existing direct flows)
    const { data, error } = await supabase
      .from("certificates")
      .insert({
        token_id: payload.tokenId,
        owner_wallet: "",
        issuer_wallet: user.email ?? "UNKNOWN",
        title: payload.title,
        description: payload.description,
        cert_type: payload.certType,
        tx_hash: payload.txHash,
        contract_id: payload.contractId,
        is_revoked: false,
        workflow_type: "standard",
        approval_status: "approved",
        approval_stage: "approved",
      })
      .select("id")
      .single();
    dbError = error;
    if (data) finalId = data.id;
  }

  if (dbError) {
    console.error("Supabase operation error:", dbError);
    throw new Error(`Database error: ${dbError.message} (code: ${dbError.code})`);
  }

  const { error: txError } = await supabase.from("transactions").insert({
    cert_id: finalId || null,
    tx_hash: payload.txHash,
    action: "MINT_CERTIFICATE",
    wallet: user.email ?? "UNKNOWN",
    status: "success",
  });

  if (txError) {
    console.warn("Failed to save transaction log:", txError.message);
  }

  return { success: true, tokenId: payload.tokenId, txHash: payload.txHash };
}

export async function submitCertificateForApprovalAction(payload: {
  title: string;
  description: string;
  certType: string;
  workflowType: "standard" | "academic";
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized: please sign in.");
  }

  const stage = payload.workflowType === "standard" ? "pending_admin" : "pending_hod";

  const { data, error } = await supabase
    .from("certificates")
    .insert({
      owner_wallet: "",
      issuer_wallet: user.email ?? "UNKNOWN",
      title: payload.title,
      description: payload.description,
      cert_type: payload.certType,
      workflow_type: payload.workflowType,
      approval_status: "pending",
      approval_stage: stage,
      is_revoked: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    throw new Error(`Database error: ${error.message}`);
  }

  return { success: true, certId: data.id };
}

