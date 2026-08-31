export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "FREE_TEXT" | "NUMERIC" | "YES_NO";

export interface PublicQuestion {
  id: string;
  position: number;
  questionType: QuestionType;
  questionText: string;
  options: string[] | null;
  required: boolean;
}

export interface PublicSurvey {
  id: string;
  title: string;
  description: string | null;
  status: "PUBLISHED" | "CLOSED";
  eligibility: Record<string, { operator: string; value?: string | number; min?: number; max?: number }> | null;
  eligibilityHash: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  questions: PublicQuestion[];
}

// --- Step 13/14: private demographic input + proof generation ---

/**
 * Whatever the participant types into the demographic form. This never
 * leaves the browser — it's consumed locally to build the ZK proof and
 * then discarded. It is NOT sent to the API in this shape, ever.
 */
export interface Demographics {
  age?: number;
  country?: string;
  employmentStatus?: string;
  educationLevel?: string;
}

/**
 * What comes back from proof generation (lib/proof.ts). Only this —
 * never the raw Demographics — is sent to the API.
 */
export interface ProofResult {
  /** Opaque proof bytes (hex-encoded), verified server-side against the circuit. */
  proof: string;
  publicSignals: {
    surveyId: string;
    eligibilityHash: string;
    /** Whether the private inputs satisfied every eligibility rule. */
    satisfied: boolean;
    nullifier: string;
  };
  /** Step 23 — one-per-(participant, survey) value used to block duplicate submissions. */
  nullifier: string;
}
