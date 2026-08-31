"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
type Result = { survey: { title: string; status: string }; summary: { totalResponses: number; totalQuestions: number; firstSubmittedAt: string | null; lastSubmittedAt: string | null }; questions: Array<any> };

function fmt(value: string | null) { return value ? new Date(value).toLocaleString() : "—"; }
function Bar({ count, total }: { count: number; total: number }) { const pct = total ? Math.round((count / total) * 100) : 0; return <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-800" style={{ width: `${pct}%` }} /></div>; }

export default function ResultsPage() {
  const params = useParams<{ surveyId: string }>();
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const token = localStorage.getItem("survey_zk_token");
    if (!token) { setError("Sign in to view results."); return; }
    fetch(`${API_URL}/surveys/${params.surveyId}/results`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => { const body = await res.json(); if (!res.ok) throw new Error(body.error ?? "Unable to load results"); return body; })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load results"));
  }, [params.surveyId]);

  if (error) return <main className="mx-auto max-w-5xl px-4 py-12"><div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-800">{error}</div></main>;
  if (!data) return <main className="mx-auto max-w-5xl px-4 py-12 text-slate-500">Loading results…</main>;

  return <main className="mx-auto max-w-5xl px-4 py-12">
    <header className="mb-8"><p className="text-sm font-medium text-slate-500">Research results</p><h1 className="mt-1 text-3xl font-semibold text-slate-900">{data.survey.title}</h1><p className="mt-2 text-sm text-slate-500">Status: {data.survey.status}</p></header>
    <section className="grid gap-4 sm:grid-cols-3"><Metric label="Responses" value={data.summary.totalResponses} /><Metric label="Questions" value={data.summary.totalQuestions} /><Metric label="Latest response" value={fmt(data.summary.lastSubmittedAt)} /></section>
    <section className="mt-8 grid gap-5">{data.questions.map((q) => <article key={q.questionId} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Question {q.position + 1} · {q.questionType.replaceAll("_", " ")}</p><h2 className="mt-2 font-semibold text-slate-900">{q.questionText}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{q.responseCount} answered</span></div>{q.stats.choices ? <div className="mt-6 space-y-4">{q.stats.choices.map((choice: any) => <div key={choice.option}><div className="flex justify-between text-sm"><span className="text-slate-700">{choice.option}</span><span className="font-medium text-slate-900">{choice.count}</span></div><Bar count={choice.count} total={q.responseCount} /></div>)}</div> : q.stats.average !== undefined ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Average", q.stats.average], ["Median", q.stats.median], ["Minimum", q.stats.min], ["Maximum", q.stats.max]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold text-slate-900">{value ?? "—"}</p></div>)}</div> : <p className="mt-5 text-sm text-slate-500">{q.stats.answered} responses recorded. Individual free-text answers are not exposed by the analytics endpoint.</p>}</article>)}</section>
    <p className="mt-8 text-xs text-slate-400">First response: {fmt(data.summary.firstSubmittedAt)} · Analytics are aggregated; participant demographic PII is not included.</p>
  </main>;
}
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p></div>; }
