import { ModelQuota } from "../types";

export interface ModelGroup {
  name: string; // "Claude / GPT" | "Gemini" | "Other"
  models: ModelQuota[];
  remainingPercentage: number | null;
  isExhausted: boolean;
  timeUntilResetMs?: number | null;
  resetTime?: string | null;
}

/**
 * Groups model quotas by provider family.
 * Claude and GPT share 1 quota pool, so they are grouped together under "Claude / GPT".
 * Gemini models are grouped under "Gemini".
 */
export function groupModels(models: ModelQuota[]): ModelGroup[] {
  const groupsMap = new Map<string, ModelQuota[]>();

  models.forEach((m) => {
    const idOrLabel = `${m.label || ""} ${m.modelId}`.toLowerCase();
    let family = "Other";
    if (idOrLabel.includes("claude") || idOrLabel.includes("gpt")) {
      family = "Claude / GPT";
    } else if (idOrLabel.includes("gemini")) {
      family = "Gemini";
    } else if (m.label) {
      family = m.label.split(" ")[0];
    }

    if (!groupsMap.has(family)) {
      groupsMap.set(family, []);
    }
    groupsMap.get(family)!.push(m);
  });

  const result: ModelGroup[] = [];

  // Enforce consistent order: "Claude / GPT", "Gemini", then others
  const order = ["Claude / GPT", "Gemini"];
  const sortedFamilies = Array.from(groupsMap.keys()).sort((a, b) => {
    const idxA = order.indexOf(a);
    const idxB = order.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  for (const familyName of sortedFamilies) {
    const groupModelsList = groupsMap.get(familyName)!;
    let minPct: number | null = null;
    let isExhausted = false;
    let minResetMs: number | null = null;
    let resetTime: string | null = null;

    groupModelsList.forEach((m) => {
      if (m.isExhausted) isExhausted = true;
      if (m.remainingPercentage !== undefined && m.remainingPercentage !== null) {
        if (minPct === null || m.remainingPercentage < minPct) {
          minPct = m.remainingPercentage;
        }
      }
      if (m.timeUntilResetMs !== undefined && m.timeUntilResetMs !== null && m.timeUntilResetMs > 0) {
        if (minResetMs === null || m.timeUntilResetMs < minResetMs) {
          minResetMs = m.timeUntilResetMs;
          resetTime = m.resetTime || null;
        }
      }
    });

    result.push({
      name: familyName,
      models: groupModelsList,
      remainingPercentage: minPct,
      isExhausted,
      timeUntilResetMs: minResetMs,
      resetTime,
    });
  }

  return result;
}
