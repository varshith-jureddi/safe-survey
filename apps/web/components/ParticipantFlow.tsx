"use client";

import { useState } from "react";
import { formatEligibilityRules } from "@/lib/eligibility";
import { generateEligibilityProof } from "@/lib/proof";
import type { Demographics, ProofResult, PublicSurvey } from "@/lib/types";
import { DemographicForm } from "./DemographicForm";
import { QuestionAnswerForm } from "./QuestionAnswerForm";

type Phase = "eligibility-explain" | "demographic-form" | "generating-proof" | "verifying" | "result" | "answer-survey" | "submitting" | "submitted";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function ParticipantFlow({ survey }: { survey: PublicSurvey }) {
  const [phase, setPhase] = useState<Phase>("eligibility-explain");
  const [proofResult, setProofResult] = useState<ProofResult | null>(null);
  const [eligibilityToken, setEligibilityToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const rules = formatEligibilityRules(survey.eligibility);

  async function handleDemographicsSubmit(demographics: Demographics) {
    if (!survey.eligibility || !survey.eligibilityHash) {
      setError("This survey has no eligibility rules configured.");
      return;
    }
    setPhase("generating-proof");
    setError(null);
    try {
      const result = await generateEligibilityProof({ demographics, eligibility: survey.eligibility, surveyId: survey.id, eligibilityHash: survey.eligibilityHash });
      setProofResult(result);
      setPhase("verifying");

      const verifyRes = await fetch(`${API_URL}/surveys/${survey.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof: result.proof,
          publicSignals: {
            ...result.publicSignals,
            satisfied: result.publicSignals.satisfied,
            nullifier: result.publicSignals.nullifier,
          },
          nullifier: result.publicSignals.nullifier,
        }),
      });
      const body = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) throw new Error(body.error ?? `Eligibility verification failed (${verifyRes.status})`);
      if (!body.verified || !body.eligibilityToken) throw new Error("Server did not issue an eligibility token.");

      setEligibilityToken(body.eligibilityToken);
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eligibility verification failed.");
      setPhase("demographic-form");
    }
  }

  async function handleAnswersSubmit(answers: Array<{ questionId: string; answer: unknown }>) {
    if (!proofResult || !eligibilityToken) return;
    setPhase("submitting");
    setSubmitError(null);
    try {
      const res = await fetch(`${API_URL}/surveys/${survey.id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eligibilityToken, nullifier: proofResult.publicOutputs.nullifier, answers }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Submission failed (${res.status})`);
      setEligibilityToken(null);
      setProofResult(null);
      setPhase("submitted");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed.");
      setPhase("answer-survey");
    }
  }

  if (phase === "submitted") return <div><h1 className="text-2xl font-semibold">{survey.title}</h1><div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-8 text-center text-emerald-800"><p className="font-medium">Thanks — your anonymous response has been recorded.</p><p className="mt-2 text-sm text-emerald-700">Your demographic values were not included with your response.</p></div></div>;

  if (phase === "answer-survey" || phase === "submitting") return <div><h1 className="text-2xl font-semibold">{survey.title}</h1><div className="mt-6"><QuestionAnswerForm questions={survey.questions} onSubmit={handleAnswersSubmit} submitting={phase === "submitting"} error={submitError} /></div></div>;

  if (phase === "result" && proofResult) return <div><h1 className="text-2xl font-semibold">{survey.title}</h1><div className="mt-6 rounded-lg border border-emerald-200 bg-white p-6"><h2 className="font-medium text-slate-800">Eligibility verified</h2><pre className="mt-3 rounded-md bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700">{[...rules.map((line) => `${line}: VERIFIED`), "Personal data: NOT REVEALED", "Eligibility token: ISSUED (10 min)"].join("\n")}</pre><p className="mt-4 text-sm text-emerald-700">You are eligible. Continue to the survey questions.</p><button type="button" onClick={() => setPhase("answer-survey")} className="mt-4 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700">Continue to questions</button></div></div>;

  if (phase === "verifying") return <div><h1 className="text-2xl font-semibold">{survey.title}</h1><div className="mt-6 rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">Verifying your eligibility proof securely...<p className="mt-2 text-xs text-slate-400">Your raw demographic values are not sent to the API.</p></div></div>;

  if (phase === "generating-proof") return <div><h1 className="text-2xl font-semibold">{survey.title}</h1><div className="mt-6 rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">Generating your privacy-preserving proof locally...</div></div>;

  if (phase === "demographic-form") return <div><h1 className="text-2xl font-semibold">{survey.title}</h1><div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">{error && <p className="mb-4 text-sm text-red-600">{error}</p>}{survey.eligibility && <DemographicForm eligibility={survey.eligibility} onSubmit={handleDemographicsSubmit} submitting={false} />}</div><button type="button" onClick={() => setPhase("eligibility-explain")} className="mt-6 text-sm font-medium text-slate-600 underline underline-offset-2">&larr; Back</button></div>;

  return <div><h1 className="text-2xl font-semibold">{survey.title}</h1><div className="mt-6 rounded-lg border border-slate-200 bg-white p-6"><h2 className="font-medium text-slate-800">What this survey requires you to prove</h2>{rules.length > 0 && <ul className="mt-3 space-y-2">{rules.map((line) => <li key={line} className="flex items-start gap-2 text-slate-700"><span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />{line}</li>)}</ul>}<div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-600"><p><strong className="text-slate-800">Your demographic details stay private.</strong> They are used in your browser to generate a ZK proof.</p><p><strong className="text-slate-800">Only the proof is sent for verification.</strong> If valid, the server issues a short-lived eligibility token.</p><p><strong className="text-slate-800">Your response uses the token and a survey-specific nullifier.</strong> Raw demographic data is never stored with the response.</p></div></div><button type="button" onClick={() => setPhase("demographic-form")} className="mt-6 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700">Continue</button></div>;
}
