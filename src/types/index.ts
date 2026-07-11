import { z } from "zod";

export const PromptCreditsSchema = z.object({
  available: z.number(),
  monthly: z.number(),
  usedPercentage: z.number(),
  remainingPercentage: z.number(),
});

export const ModelQuotaSchema = z.object({
  label: z.string(),
  modelId: z.string(),
  remainingPercentage: z.number().optional().nullable(),
  isExhausted: z.boolean(),
  resetTime: z.string().optional().nullable(),
  timeUntilResetMs: z.number().optional().nullable(),
  isAutocompleteOnly: z.boolean(),
});

export const QuotaSnapshotSchema = z.object({
  timestamp: z.string(),
  method: z.string(),
  email: z.string().optional().nullable(),
  planType: z.string().optional().nullable(),
  promptCredits: PromptCreditsSchema.optional().nullable(),
  models: z.array(ModelQuotaSchema),
});

export const AccountDataSchema = z.object({
  email: z.string(),
  isActive: z.boolean(),
  status: z.string(), // "valid" | "expired" | "invalid"
  lastUsed: z.string().optional().nullable(),
  addedAt: z.string().optional().nullable(),
  cachedCredits: PromptCreditsSchema.optional().nullable(),
  cachedSnapshot: QuotaSnapshotSchema.optional().nullable(),
});

export type PromptCredits = z.infer<typeof PromptCreditsSchema>;
export type ModelQuota = z.infer<typeof ModelQuotaSchema>;
export type QuotaSnapshot = z.infer<typeof QuotaSnapshotSchema>;
export type AccountData = z.infer<typeof AccountDataSchema>;

export interface AppSettings {
  theme: "light" | "dark";
  autoRefreshInterval: "manual" | "30s" | "1m" | "5m";
}
