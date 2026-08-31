import { notFound, redirect } from "next/navigation";
import { ParticipantFlow } from "@/components/ParticipantFlow";
import type { PublicSurvey } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function getSurvey(surveyId: string): Promise<PublicSurvey | null> {
  const res = await fetch(`${API_URL}/surveys/${surveyId}/public`, { cache: "no-store" });

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to load survey (${res.status})`);
  }

  const data = await res.json();
  return data.survey as PublicSurvey;
}

export default async function ParticipatePage({ params }: { params: { surveyId: string } }) {
  const survey = await getSurvey(params.surveyId);

  if (!survey) {
    notFound();
  }

  // A closed survey has nothing to participate in — send them back to the
  // read-only view, which already shows the "closed" banner.
  if (survey.status === "CLOSED") {
    redirect(`/survey/${survey.id}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <ParticipantFlow survey={survey} />
    </main>
  );
}
