export const AI_ASK_EVENT = "cc:ai-ask";

export function askAi(query: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(AI_ASK_EVENT, { detail: query }));
  const el = document.getElementById("ai-assistant");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}