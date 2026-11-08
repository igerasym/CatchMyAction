/** Feedback constants shared by the dialog (browser) and the API (server). No imports, so it is safe in both. */

export const FEEDBACK_TYPES = ["bug", "idea", "question"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_LABEL: Record<FeedbackType, string> = {
  bug: "Bug",
  idea: "Idea",
  question: "Question",
};

export const MIN_MESSAGE = 5;
export const MAX_MESSAGE = 2000;

/** Window event that opens the Feedback dialog from any button. */
export const OPEN_FEEDBACK = "cma:open-feedback";

export interface OpenFeedbackDetail {
  type?: FeedbackType;
  /** Text to start the message with, e.g. an error reference */
  message?: string;
}

export function openFeedback(detail?: OpenFeedbackDetail) {
  window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK, { detail }));
}
