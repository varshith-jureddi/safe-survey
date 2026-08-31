import type { PublicQuestion } from "@/lib/types";

function QuestionBody({ question }: { question: PublicQuestion }) {
  switch (question.questionType) {
    case "SINGLE_CHOICE":
    case "MULTIPLE_CHOICE":
      return (
        <ul className="mt-3 space-y-2">
          {(question.options ?? []).map((option) => (
            <li key={option} className="flex items-center gap-2 text-slate-600">
              <span
                className={
                  question.questionType === "SINGLE_CHOICE"
                    ? "h-3.5 w-3.5 flex-shrink-0 rounded-full border border-slate-300"
                    : "h-3.5 w-3.5 flex-shrink-0 rounded border border-slate-300"
                }
              />
              {option}
            </li>
          ))}
        </ul>
      );
    case "YES_NO":
      return (
        <div className="mt-3 flex gap-2">
          <span className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600">
            Yes
          </span>
          <span className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600">
            No
          </span>
        </div>
      );
    case "NUMERIC":
      return (
        <div className="mt-3 h-9 w-32 rounded-md border border-slate-300 bg-slate-50" aria-hidden />
      );
    case "FREE_TEXT":
    default:
      return (
        <div className="mt-3 h-20 w-full rounded-md border border-slate-300 bg-slate-50" aria-hidden />
      );
  }
}

export function QuestionPreview({ question, index }: { question: PublicQuestion; index: number }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-slate-800">
        <span className="mr-2 text-slate-400">{index + 1}.</span>
        {question.questionText}
        {question.required && <span className="ml-1 text-rose-500">*</span>}
      </p>
      <QuestionBody question={question} />
    </li>
  );
}
