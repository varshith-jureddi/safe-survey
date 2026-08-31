import type { Question } from "@prisma/client";

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates one participant answer against its question's type/options,
 * per the 5 MVP question types from Step 7.
 */
export function validateAnswer(question: Question, answer: unknown): ValidationResult {
  const label = `Answer to "${question.questionText}"`;

  if (answer === undefined || answer === null || answer === "") {
    if (question.required) {
      return { valid: false, error: `${label} is required` };
    }
    return { valid: true };
  }

  switch (question.questionType) {
    case "YES_NO": {
      if (typeof answer !== "boolean") {
        return { valid: false, error: `${label} must be true or false` };
      }
      return { valid: true };
    }

    case "NUMERIC": {
      if (typeof answer !== "number" || Number.isNaN(answer)) {
        return { valid: false, error: `${label} must be a number` };
      }
      return { valid: true };
    }

    case "FREE_TEXT": {
      if (typeof answer !== "string") {
        return { valid: false, error: `${label} must be text` };
      }
      if (answer.length > 5000) {
        return { valid: false, error: `${label} exceeds 5000 characters` };
      }
      return { valid: true };
    }

    case "SINGLE_CHOICE": {
      const options = (question.options as string[] | null) ?? [];
      if (typeof answer !== "string" || !options.includes(answer)) {
        return { valid: false, error: `${label} must be one of the survey's provided options` };
      }
      return { valid: true };
    }

    case "MULTIPLE_CHOICE": {
      const options = (question.options as string[] | null) ?? [];
      if (!Array.isArray(answer) || answer.length === 0) {
        return { valid: false, error: `${label} must be a non-empty array of selected options` };
      }
      const allValid = answer.every((a) => typeof a === "string" && options.includes(a));
      if (!allValid) {
        return { valid: false, error: `${label} contains an option not offered by this question` };
      }
      return { valid: true };
    }

    default:
      return { valid: false, error: `${label}: unknown question type "${question.questionType}"` };
  }
}
