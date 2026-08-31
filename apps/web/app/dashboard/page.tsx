"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Survey = { id: string; title: string; status: string; description: string | null; responseCount: number; createdAt: string };

export default function DashboardPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("survey_zk_token");
    if (!token) { setError("Sign in to view your research dashboard."); return; }
    fetch(`${API_URL}/surveys`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => { const body = await res.json(); if (!res.ok) throw new Error(body.error ?? "Unable to load surveys"); return body; })
      .then((body) => setSurveys(body.surveys ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load surveys"));
  }, []);

  return <main className="mx-auto max-w-5xl px-4 py-12">
    <div className="mb-8"><p className="text-sm font-medium text-slate-500">Researcher workspace</p><h1 className="mt-1 text-3xl font-semibold text-slate-900">Survey dashboard</h1><p className="mt-2 text-slate-600">Monitor response volume and question-level results without exposing participant demographics.</p></div>
    {error ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-800">{error}</div> : <div className="grid gap-4">{surveys.map((survey) => <div key={survey.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-900">{survey.title}</h2><p className="mt-1 text-sm text-slate-500">{survey.description || "No description"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{survey.status}</span></div><div className="mt-5 flex items-center justify-between"><span className="text-sm text-slate-600"><strong className="text-slate-900">{survey.responseCount}</strong> responses</span><Link className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700" href={`/surveys/${survey.id}/results`}>View results</Link></div></div>)}{surveys.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">No surveys yet.</div>}</div>}
  </main>;
}
