"use client";

import { useMemo, useState } from "react";
import type { Demographics } from "@/lib/types";
import type { EligibilityRules } from "@/lib/eligibility";

const EMPLOYMENT_OPTIONS = ["EMPLOYED", "UNEMPLOYED", "STUDENT", "RETIRED", "SELF_EMPLOYED"];
const EDUCATION_OPTIONS = ["HIGH_SCHOOL", "UNIVERSITY", "POSTGRADUATE"];

function fieldLabel(attribute: string): string {
  switch (attribute) {
    case "age":
      return "Age";
    case "country":
      return "Country (ISO 2-letter code, e.g. US, IN, GB)";
    case "employmentStatus":
      return "Employment status";
    case "educationLevel":
      return "Education level";
    default:
      return attribute;
  }
}

export function DemographicForm({
  eligibility,
  onSubmit,
  submitting,
}: {
  eligibility: EligibilityRules;
  onSubmit: (demographics: Demographics) => void;
  submitting: boolean;
}) {
  const attributes = useMemo(() => Object.keys(eligibility), [eligibility]);
  const [values, setValues] = useState<Demographics>({});

  const isComplete = attributes.every((attr) => {
    const v = values[attr as keyof Demographics];
    return v !== undefined && v !== "";
  });

  function setField<K extends keyof Demographics>(key: K, value: Demographics[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isComplete) onSubmit(values);
      }}
      className="space-y-5"
    >
      <p className="text-sm text-slate-500">
        Enter your details below. This form is entirely local to your browser — nothing here is
        sent anywhere. It&apos;s used only to generate a cryptographic proof on the next step.
      </p>

      {attributes.map((attribute) => {
        const label = fieldLabel(attribute);

        if (attribute === "age") {
          return (
            <div key={attribute}>
              <label className="block text-sm font-medium text-slate-700">{label}</label>
              <input
                type="number"
                min={0}
                max={130}
                required
                value={values.age ?? ""}
                onChange={(e) => setField("age", e.target.value === "" ? undefined : Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          );
        }

        if (attribute === "country") {
          return (
            <div key={attribute}>
              <label className="block text-sm font-medium text-slate-700">{label}</label>
              <input
                type="text"
                maxLength={2}
                required
                value={values.country ?? ""}
                onChange={(e) => setField("country", e.target.value.toUpperCase())}
                placeholder="US"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase focus:border-slate-500 focus:outline-none"
              />
            </div>
          );
        }

        const options = attribute === "employmentStatus" ? EMPLOYMENT_OPTIONS : EDUCATION_OPTIONS;
        const current =
          attribute === "employmentStatus" ? values.employmentStatus : values.educationLevel;

        return (
          <div key={attribute}>
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            <select
              required
              value={current ?? ""}
              onChange={(e) =>
                setField(
                  attribute === "employmentStatus" ? "employmentStatus" : "educationLevel",
                  e.target.value,
                )
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="" disabled>
                Select...
              </option>
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      <button
        type="submit"
        disabled={!isComplete || submitting}
        className="w-full rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Generating proof..." : "Generate proof"}
      </button>
    </form>
  );
}
