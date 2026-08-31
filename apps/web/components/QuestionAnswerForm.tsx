"use client";

import { useState } from "react";
import type { PublicQuestion } from "@/lib/types";

type AnswerValue = string | number | boolean | string[];

export function QuestionAnswerForm({
  questions,
  onSubmit,
  submitting,
  error,
}: {
  questions: PublicQuestion[];
  onSubmit: (answers: Array<{ questionId: string; answer: AnswerValue }>) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [values, setValues] = useState<Record<string, AnswerValue>>({});

  function setAnswer(questionId: string, value: AnswerValue) {
    setValues((prev) => ({ ...prev, [questionId]: value }));
  }

  function toggleMultiChoice(questionId: string, option: string) {
    const current = (values[questionId] as string[] | undefined) ?? [];
    const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
    setAnswer(questionId, next);
  }

  const missingRequired = questions.some((q) => {
    if (!q.required) return false;
    const v = values[q.id];
    return v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const answers = questions
      .filter((q) => values[q.id] !== undefined)
      .map((q) => ({ questionId: q.id, answer: values[q.id] }));
    onSubmit(answers);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {questions
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((q) => (
          <div key={q.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <label className="block text-sm font-medium text-slate-800">
              {q.questionText}
              {q.required && <span className="ml-1 text-red-500">*</span>}
            </label>

            {q.questionType === "YES_NO" && (
              <div className="mt-2 flex gap-4 text-sm">
                {["Yes", "No"].map((opt) => (
                  <label key={opt} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name={q.id}
                      checked={values[q.id] === (opt === "Yes")}
                      onChange={() => setAnswer(q.id, opt === "Yes")}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {q.questionType === "NUMERIC" && (
              <input
                type="number"
                value={(values[q.id] as number | undefined) ?? ""}
                onChange={(e) => setAnswer(q.id, e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            )}

            {q.questionType === "FREE_TEXT" && (
              <textarea
                value={(values[q.id] as string | undefined) ?? ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            )}

            {q.questionType === "SINGLE_CHOICE" && (
              <div className="mt-2 space-y-1.5 text-sm">
                {(q.options ?? []).map((opt) => (
                  <label key={opt} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name={q.id}
                      checked={values[q.id] === opt}
                      onChange={() => setAnswer(q.id, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {q.questionType === "MULTIPLE_CHOICE" && (
              <div className="mt-2 space-y-1.5 text-sm">
                {(q.options ?? []).map((opt) => (
                  <label key={opt} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={((values[q.id] as string[] | undefined) ?? []).includes(opt)}
                      onChange={() => toggleMultiChoice(q.id, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

      <button
        type="submit"
        disabled={missingRequired || submitting}
        className="w-full rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit response"}
      </button>
    </form>
  );
}
