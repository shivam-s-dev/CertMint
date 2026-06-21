"use client";

import { useMemo, useState } from "react";
import { useIntegration } from "@/hooks/use-integration";

type CertType = "HACKATHON" | "COURSE" | "EVENT" | "ACHIEVEMENT";
type MintStep = 1 | 2 | 3;
type TxState = "idle" | "waiting" | "submitted" | "success" | "error";
type CardTheme = "sunrise" | "ocean" | "sand";

interface FormState {
  title: string;
  description: string;
  certType: CertType;
  badgeIcon: string;
  cardTheme: CardTheme;
}

const certTypeLabels: Record<CertType, string> = {
  HACKATHON: "Hackathon",
  COURSE: "Course",
  EVENT: "Event",
  ACHIEVEMENT: "Achievement",
};

const themeClasses: Record<CardTheme, string> = {
  sunrise: "from-[#FFF0E7] via-[#FFE3D4] to-[#FFD7C2] border-[#E2BFAF]",
  ocean: "from-[#EAF6FF] via-[#DDEFFF] to-[#D1E8FF] border-[#AFC9E2]",
  sand: "from-[#F9F2E6] via-[#F2E7D6] to-[#ECDDCA] border-[#D7C2A9]",
};



function MintCertificateWizard() {
  const [step, setStep] = useState<MintStep>(1);
  const [txState, setTxState] = useState<TxState>("idle");
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { walletAddress, connectWallet, mintCertificateTx } = useIntegration();

  const [workflowType, setWorkflowType] = useState<"standard" | "academic">("standard");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    title: "Best DeFi Project",
    description: "Awarded for building an innovative decentralized finance protocol.",
    certType: "HACKATHON",
    badgeIcon: "🏆",
    cardTheme: "sunrise",
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const issuedDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, []);



  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateStepOne() {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) nextErrors.title = "Title is required.";
    if (!form.description.trim()) nextErrors.description = "Description is required.";
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (step === 1 && !validateStepOne()) {
      return;
    }
    if (step < 3) {
      setStep((prev) => (prev + 1) as MintStep);
    }
  }

  function goBack() {
    if (step > 1) {
      setStep((prev) => (prev - 1) as MintStep);
    }
  }

  function resetFlow() {
    setStep(1);
    setTxState("idle");
    setTokenId(null);
    setTxHash(null);
    setErrorMessage(null);
    setSubmittedId(null);
    setIsSubmitting(false);
  }

  async function handleSubmitForApproval() {
    setIsSubmitting(true);
    setErrorMessage(null);
    setTxState("waiting");
    try {
      const { submitCertificateForApprovalAction } = await import("@/app/(minter)/mint/actions");
      const result = await submitCertificateForApprovalAction({
        title: form.title,
        description: form.description,
        certType: form.certType,
        workflowType,
      });

      if (result.success) {
        setSubmittedId(result.certId);
        setTxState("success");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to submit for approval.");
      setTxState("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMint() {
    setTxState("waiting");
    setTokenId(null);
    setTxHash(null);
    setErrorMessage(null);

    let currentAddress = walletAddress;
    try {
      if (!currentAddress) {
        currentAddress = await connectWallet();
      }
    } catch (e) {
      console.error("Failed to check Freighter", e);
    }

    if (!currentAddress) {
      setErrorMessage("Please connect your Freighter wallet using the top right button.");
      setTxState("idle");
      return;
    }

    try {
      const { realHash, generatedTokenId, contractId } = await mintCertificateTx(currentAddress, form);

      // Save to Supabase with real on-chain hash
      const { saveMintedCertificateAction } = await import("@/app/(minter)/mint/actions");
      await saveMintedCertificateAction({
        tokenId: generatedTokenId,
        certType: form.certType,
        title: form.title,
        description: form.description,
        txHash: realHash,
        contractId,
      });

      setTokenId(generatedTokenId);
      setTxHash(realHash);
      setTxState("success");

    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Transaction failed";
      setErrorMessage(message);
      setTxState("error");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.6rem] border border-[#EAD6CC] bg-white/90 p-6 shadow-[0_20px_50px_-35px_rgba(128,79,50,0.45)] sm:p-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <StepBadge current={step} index={1} title="Details" />
          <StepBadge current={step} index={2} title="Style" />
          <StepBadge current={step} index={3} title="Confirm" />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[3fr,2fr]">
          <section className="rounded-2xl border border-[#E8D4CA] bg-[#FFF8F4] p-5">
            {step === 1 ? (
              <div className="space-y-4">
                <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#1A1211]">Step 1: Details</h2>

                <div>
                  <label className="text-sm font-semibold text-[#2C211D]" htmlFor="title">
                    Title*
                  </label>
                  <input
                    id="title"
                    value={form.title}
                    onChange={(event) => updateForm("title", event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#DFC8BC] bg-white px-4 py-3 text-sm text-[#2D2220] outline-none focus:border-[#C55B34] focus:ring-2 focus:ring-[#F6D5C8]"
                  />
                  {fieldErrors.title ? <p className="mt-1 text-xs text-[#A54527]">{fieldErrors.title}</p> : null}
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#2C211D]" htmlFor="description">
                    Description*
                  </label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(event) => updateForm("description", event.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-[#DFC8BC] bg-white px-4 py-3 text-sm text-[#2D2220] outline-none focus:border-[#C55B34] focus:ring-2 focus:ring-[#F6D5C8]"
                  />
                  {fieldErrors.description ? <p className="mt-1 text-xs text-[#A54527]">{fieldErrors.description}</p> : null}
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#2C211D]" htmlFor="certType">
                    Type*
                  </label>
                  <select
                    id="certType"
                    value={form.certType}
                    onChange={(event) => updateForm("certType", event.target.value as CertType)}
                    className="mt-2 w-full rounded-xl border border-[#DFC8BC] bg-white px-4 py-3 text-sm text-[#2D2220] outline-none focus:border-[#C55B34] focus:ring-2 focus:ring-[#F6D5C8]"
                  >
                    <option value="HACKATHON">Hackathon</option>
                    <option value="COURSE">Course</option>
                    <option value="EVENT">Event</option>
                    <option value="ACHIEVEMENT">Achievement</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#2C211D]" htmlFor="workflowType">
                    Approval Workflow*
                  </label>
                  <select
                    id="workflowType"
                    value={workflowType}
                    onChange={(event) => setWorkflowType(event.target.value as "standard" | "academic")}
                    className="mt-2 w-full rounded-xl border border-[#DFC8BC] bg-white px-4 py-3 text-sm text-[#2D2220] outline-none focus:border-[#C55B34] focus:ring-2 focus:ring-[#F6D5C8]"
                  >
                    <option value="standard">Standard (Issuer → Admin Approval)</option>
                    <option value="academic">Academic (Faculty → HOD → Registrar Approval)</option>
                  </select>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#1A1211]">Step 2: Style</h2>
                <p className="text-sm text-[#625854]">Customize the badge icon and card theme before minting.</p>

                <div>
                  <label className="text-sm font-semibold text-[#2C211D]" htmlFor="badgeIcon">
                    Badge Icon
                  </label>
                  <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {["🏆", "🎓", "🎪", "⭐", "🥇", "🚀"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => updateForm("badgeIcon", emoji)}
                        className={`rounded-xl border px-3 py-2 text-xl ${
                          form.badgeIcon === emoji
                            ? "border-[#C85F37] bg-[#FFEFE6]"
                            : "border-[#E3CDC1] bg-white hover:bg-[#FFF7F2]"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#2C211D]">Card Theme</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    <ThemeChoice
                      label="Sunrise"
                      active={form.cardTheme === "sunrise"}
                      onClick={() => updateForm("cardTheme", "sunrise")}
                      previewClass="from-[#FFF0E7] to-[#FFD7C2]"
                    />
                    <ThemeChoice
                      label="Ocean"
                      active={form.cardTheme === "ocean"}
                      onClick={() => updateForm("cardTheme", "ocean")}
                      previewClass="from-[#EAF6FF] to-[#D1E8FF]"
                    />
                    <ThemeChoice
                      label="Sand"
                      active={form.cardTheme === "sand"}
                      onClick={() => updateForm("cardTheme", "sand")}
                      previewClass="from-[#F9F2E6] to-[#ECDDCA]"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#1A1211]">Review Your Certificate</h2>

                <div className="rounded-xl border border-[#E8D4CA] bg-white p-4 text-sm text-[#4E4340]">
                  <p>Est. fee: 0.001 XLM</p>
                  <p className="mt-1">Network: Stellar Testnet</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={resetFlow}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#D6BCAD] bg-white px-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#362824]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitForApproval}
                    disabled={isSubmitting || txState === "waiting"}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#C85F37] bg-[#C85F37] px-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#FFF8F4] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Submitting..." : `Submit for ${workflowType === "standard" ? "Admin" : "HOD"} Approval 🚀`}
                  </button>
                </div>

                {/* Success Panel */}
                {txState === "success" && submittedId ? (
                  <div className="rounded-2xl border-2 border-[#B9D9C0] bg-[#EFFAF1] p-5">
                    <p className="font-semibold text-[#1A6A31] text-base">🎉 Submitted for Approval!</p>
                    <p className="mt-1 text-xs text-[#4A7A55]">
                      Your request has been successfully registered. It is now pending review from the authorities.
                    </p>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl border border-[#B9D9C0] bg-white px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#4A7A55]">Workflow Type</p>
                        <p className="mt-1 font-semibold text-[#1A1211] capitalize">{workflowType} workflow</p>
                      </div>
                      <div className="rounded-xl border border-[#B9D9C0] bg-white px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#4A7A55]">Initial Stage</p>
                        <p className="mt-1 font-semibold text-[#1A1211]">
                          {workflowType === "standard" ? "Pending Admin" : "Pending HOD"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.location.href = "/manage-minted"}
                      className="mt-4 w-full rounded-xl border border-[#C55B34] bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#C55B34] transition hover:bg-[#FFF1EA]"
                    >
                      Go to Manage Page
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#E8D4CA] bg-white p-4 text-sm text-[#4E4340]">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A7165]">Submission Status</p>
                    <div className="mt-2 space-y-2">
                      <p className={txState === "waiting" ? "text-[#AA4C2F] font-semibold" : "text-[#6F625E]"}>
                        {txState === "waiting" ? "⏳ Submitting for approval..." : "◦ Waiting to submit..."}
                      </p>
                      {txState === "error" && errorMessage && (
                        <p className="text-[#A54527] font-semibold">❌ {errorMessage}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 1}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#D6BCAD] bg-white px-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#362824] disabled:cursor-not-allowed disabled:opacity-60"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={step === 3 || txState === "waiting" || txState === "submitted"}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#C85F37] bg-[#C85F37] px-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#FFF8F4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next →
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E8D4CA] bg-white p-5 md:sticky md:top-6 md:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C55B34]">Live Preview</p>

            <article className={`mt-4 rounded-2xl border bg-gradient-to-br p-5 ${themeClasses[form.cardTheme]}`}>
              <p className="text-2xl">{form.badgeIcon} {form.certType}</p>
              <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl text-[#201714]">{form.title || "Certificate Title"}</h3>
              <p className="mt-2 text-sm text-[#4F423E]">{form.description || "Certificate description"}</p>

              <div className="mt-5 space-y-1 text-sm text-[#4A3E3A]">
                <p>{issuedDate}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-[#7E6A62]">Type: {certTypeLabels[form.certType]}</p>
                <p className="text-xs text-[#9E8880]">Verification ID will be generated on mint</p>
              </div>
            </article>


            {errorMessage && (
              <div className="mt-3 rounded-lg border border-[#E7B6A0] bg-[#FFF1EA] p-3 text-xs text-[#8C3F1E]">
                {errorMessage}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

export { MintCertificateWizard };
export default MintCertificateWizard;

function StepBadge({ current, index, title }: { current: MintStep; index: 1 | 2 | 3; title: string }) {
  const state = current === index ? "current" : current > index ? "done" : "upcoming";

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
        state === "current"
          ? "border-[#C85F37] bg-[#FFEFE6] text-[#7D371E]"
          : state === "done"
            ? "border-[#B8D7BF] bg-[#EFFAF1] text-[#1A6A31]"
            : "border-[#E7D5CC] bg-white text-[#6A5C57]"
      }`}
    >
      Step {index} - {title}
    </div>
  );
}

function ThemeChoice({
  label,
  active,
  onClick,
  previewClass,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  previewClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left ${active ? "border-[#C85F37] bg-[#FFEFE6]" : "border-[#E3CDC1] bg-white"}`}
    >
      <span className={`block h-7 w-full rounded-md bg-gradient-to-r ${previewClass}`} />
      <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.1em] text-[#544844]">{label}</span>
    </button>
  );
}
