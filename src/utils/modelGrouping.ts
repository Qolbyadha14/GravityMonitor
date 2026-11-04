import { ModelQuota, QuotaBucket, QuotaGroup, QuotaSummary } from "../types";

export interface ModelGroup {
  name: string; // "Claude / GPT" | "Gemini" | "Other"
  versionTag?: string | null; // e.g. "Claude 5.5", "Claude 4.6"
  models: ModelQuota[];
  remainingPercentage: number | null;
  isExhausted: boolean;
  timeUntilResetMs?: number | null;
  resetTime?: string | null;
  weeklyBucket?: QuotaBucket | null;
  fiveHourBucket?: QuotaBucket | null;
  quotaGroup?: QuotaGroup | null;
}

/**
 * Detects the Claude model generation/version (e.g. "Claude 5.5", "Claude 4.6")
 * available to an account.
 */
export function detectModelVersionTag(models: ModelQuota[]): string | null {
  if (!models || models.length === 0) return null;
  const hasClaude55 = models.some(
    (m) => m.modelId.includes("5-5") || (m.label && m.label.includes("5.5"))
  );
  if (hasClaude55) return "Claude 5.5";
  const hasClaude46 = models.some(
    (m) => m.modelId.includes("4-6") || (m.label && m.label.includes("4.6"))
  );
  if (hasClaude46) return "Claude 4.6";
  return null;
}

/**
 * Parses an ISO reset time or ms timestamp into a human-readable duration
 * e.g., "4d 2h", "4h 55m", "32m", or null if invalid/passed.
 */
export function formatResetDuration(resetTime?: string | null, ms?: number | null): string | null {
  let diffMs: number | null = null;

  if (resetTime) {
    const target = new Date(resetTime).getTime();
    if (!isNaN(target)) {
      diffMs = target - Date.now();
    }
  }

  if ((diffMs === null || diffMs <= 0) && ms !== undefined && ms !== null && ms > 0) {
    diffMs = ms;
  }

  if (diffMs === null || diffMs <= 0) {
    return null;
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Finds the corresponding QuotaGroup in QuotaSummary for a given family name.
 */
export function matchQuotaGroup(familyName: string, summary?: QuotaSummary | null): QuotaGroup | undefined {
  // Guard clause: ensure groups exist
  if (!summary?.groups || summary.groups.length === 0) {
    return undefined;
  }

  const lowerFamily = familyName.toLowerCase();
  return summary.groups.find((g) => {
    const lowerName = g.displayName.toLowerCase();
    if (lowerFamily.includes("claude") || lowerFamily.includes("gpt")) {
      return lowerName.includes("claude") || lowerName.includes("gpt") || lowerName.includes("3p");
    }
    if (lowerFamily.includes("gemini")) {
      return lowerName.includes("gemini");
    }
    return lowerName.includes(lowerFamily);
  });
}

/**
 * Groups model quotas by provider family and binds Weekly/5-Hour quota buckets if available.
 * Claude and GPT share 1 quota pool, so they are grouped together under "Claude / GPT".
 * Gemini models are grouped under "Gemini".
 */
export function groupModels(models: ModelQuota[], quotaSummary?: QuotaSummary | null): ModelGroup[] {
  // Guard clause: empty models list
  if (!models || models.length === 0) {
    return [];
  }

  const groupsMap = new Map<string, ModelQuota[]>();

  models.forEach((m) => {
    // Guard clause: ignore internal editor/autocomplete models (e.g. chat_20706, tab_*)
    // from generating top-level agent quota cards
    if (m.isAutocompleteOnly || m.modelId.startsWith("chat_") || m.modelId.startsWith("tab_")) {
      return;
    }

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

    // Match with quota summary if provided
    const matchedQuotaGroup = matchQuotaGroup(familyName, quotaSummary);
    let weeklyBucket: QuotaBucket | null = null;
    let fiveHourBucket: QuotaBucket | null = null;

    if (matchedQuotaGroup?.buckets) {
      for (const b of matchedQuotaGroup.buckets) {
        const lowerName = b.displayName.toLowerCase();
        const lowerId = (b.bucketId || "").toLowerCase();
        const win = (b.window || "").toLowerCase();

        if (win === "weekly" || lowerName.includes("weekly") || lowerId.includes("weekly")) {
          weeklyBucket = b;
        } else if (win === "5h" || lowerName.includes("five hour") || lowerName.includes("5h") || lowerId.includes("5h")) {
          fiveHourBucket = b;
        }
      }

      // If fiveHourBucket has remainingFraction, update minPct and reset time
      if (fiveHourBucket?.remainingFraction !== undefined && fiveHourBucket?.remainingFraction !== null) {
        minPct = fiveHourBucket.remainingFraction;
        if (fiveHourBucket.resetTime) {
          resetTime = fiveHourBucket.resetTime;
        }
      }

      if (weeklyBucket?.remainingFraction === 0 || fiveHourBucket?.remainingFraction === 0) {
        isExhausted = true;
      }
    }

    // Ensure models within the group reflect the shared pool quota
    const modelsWithQuota = groupModelsList.map((m) => {
      if (fiveHourBucket?.remainingFraction !== undefined && fiveHourBucket?.remainingFraction !== null) {
        return {
          ...m,
          remainingPercentage: fiveHourBucket.remainingFraction,
          isExhausted: fiveHourBucket.remainingFraction === 0,
          resetTime: fiveHourBucket.resetTime ?? m.resetTime,
          timeUntilResetMs: fiveHourBucket.resetTime
            ? Math.max(0, new Date(fiveHourBucket.resetTime).getTime() - Date.now())
            : m.timeUntilResetMs,
        };
      }
      return m;
    });

    result.push({
      name: familyName,
      versionTag: familyName === "Claude / GPT" ? detectModelVersionTag(groupModelsList) : null,
      models: modelsWithQuota,
      remainingPercentage: minPct,
      isExhausted,
      timeUntilResetMs: minResetMs,
      resetTime,
      weeklyBucket,
      fiveHourBucket,
      quotaGroup: matchedQuotaGroup ?? null,
    });
  }

  return result;
}
