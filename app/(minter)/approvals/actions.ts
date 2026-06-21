"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function verifyReviewerAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized: please sign in.");
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new Error("Failed to load user role.");
  }

  if (profile.role !== "hod" && profile.role !== "registrar") {
    throw new Error("Forbidden: You are not authorized as a reviewer.");
  }

  return { supabase, role: profile.role, userEmail: user.email };
}

export async function academicApproveAction(formData: FormData) {
  let hasError = false;
  let errorMsg = "";

  try {
    const { supabase, role } = await verifyReviewerAccess();
    const certId = String(formData.get("certId") ?? "").trim();

    if (!certId) {
      throw new Error("Missing certificate ID.");
    }

    // Determine the next stage
    const nextStage = role === "hod" ? "pending_registrar" : "approved";
    const nextStatus = role === "hod" ? "pending" : "approved";

    const { error } = await supabase
      .from("certificates")
      .update({
        approval_status: nextStatus,
        approval_stage: nextStage,
      })
      .eq("id", certId)
      .eq("approval_stage", role === "hod" ? "pending_hod" : "pending_registrar");

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

  } catch (err: any) {
    hasError = true;
    errorMsg = err.message || "Approval failed.";
  }

  revalidatePath("/approvals");
  revalidatePath("/dashboard");
  revalidatePath("/manage-minted");

  if (hasError) {
    redirect(`/approvals?error=${encodeURIComponent(errorMsg)}`);
  } else {
    redirect("/approvals?success=Certificate+advanced+successfully.");
  }
}

export async function academicRejectAction(formData: FormData) {
  let hasError = false;
  let errorMsg = "";

  try {
    const { supabase, role } = await verifyReviewerAccess();
    const certId = String(formData.get("certId") ?? "").trim();
    const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();

    if (!certId || !rejectionReason) {
      throw new Error("Missing certificate ID or rejection reason.");
    }

    const { error } = await supabase
      .from("certificates")
      .update({
        approval_status: "rejected",
        approval_stage: "rejected",
        rejection_reason: rejectionReason,
      })
      .eq("id", certId)
      .eq("approval_stage", role === "hod" ? "pending_hod" : "pending_registrar");

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

  } catch (err: any) {
    hasError = true;
    errorMsg = err.message || "Rejection failed.";
  }

  revalidatePath("/approvals");
  revalidatePath("/dashboard");
  revalidatePath("/manage-minted");

  if (hasError) {
    redirect(`/approvals?error=${encodeURIComponent(errorMsg)}`);
  } else {
    redirect("/approvals?success=Certificate+rejected+successfully.");
  }
}
