import type { AnalysisResponse } from "../lib/messages";

export interface StatusInfo {
  emoji: string;
  text: string;
}

export function formatStatus(result: AnalysisResponse | null): StatusInfo {
  if (!result) {
    return { emoji: "🟡", text: "Prêt à analyser." };
  }

  if (result.kind === "detail") {
    const count = result.offersCount || 1;
    return { emoji: "✅", text: `Détail détecté (${count} offre)` };
  }

  if (result.kind === "list") {
    const count = result.offersCount || 0;
    return { emoji: "✅", text: `Liste détectée : ${count} offre${count > 1 ? "s" : ""}` };
  }

  if (result.kind === "out_of_scope") {
    return { emoji: "⛔", text: "Page hors périmètre FreeWork" };
  }

  if (result.kind === "pending") {
    return { emoji: "⏳", text: "Contenu en cours de chargement, réessayez." };
  }

  if (result.kind === "none") {
    const reason = result.reason ? ` — ${capitalizeFirst(result.reason)}` : "";
    return { emoji: "⚠️", text: `Aucune offre détectable${reason}` };
  }

  return { emoji: "⚠️", text: "Aucune offre détectable." };
}

function capitalizeFirst(text: string): string {
  if (!text) {
    return "";
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}
