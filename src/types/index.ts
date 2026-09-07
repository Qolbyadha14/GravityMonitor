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

export const QuotaBucketSchema = z.object({
  bucketId: z.string().optional().nullable(),
  displayName: z.string(), // "Weekly Limit Remaining" | "Five Hour Limit Remaining"
  window: z.string().optional().nullable(), // "weekly" | "5h"
  description: z.string().optional().nullable(),
  remainingFraction: z.number().optional().nullable(),
  resetTime: z.string().optional().nullable(),
});

export const QuotaGroupSchema = z.object({
  displayName: z.string(), // "Gemini Models" | "Claude and GPT models"
  description: z.string().optional().nullable(),
  buckets: z.array(QuotaBucketSchema),
});

export const QuotaSummarySchema = z.object({
  groups: z.array(QuotaGroupSchema),
  description: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});

export const AccountDataSchema = z.object({
  email: z.string(),
  isActive: z.boolean(),
  status: z.string(), // "valid" | "expired" | "invalid"
  lastUsed: z.string().optional().nullable(),
  addedAt: z.string().optional().nullable(),
  tokenExpiresAt: z.number().optional().nullable(), // unix ms
  cachedCredits: PromptCreditsSchema.optional().nullable(),
  cachedSnapshot: QuotaSnapshotSchema.optional().nullable(),
  quotaSummary: QuotaSummarySchema.optional().nullable(),
});

export type PromptCredits = z.infer<typeof PromptCreditsSchema>;
export type ModelQuota = z.infer<typeof ModelQuotaSchema>;
export type QuotaSnapshot = z.infer<typeof QuotaSnapshotSchema>;
export type QuotaBucket = z.infer<typeof QuotaBucketSchema>;
export type QuotaGroup = z.infer<typeof QuotaGroupSchema>;
export type QuotaSummary = z.infer<typeof QuotaSummarySchema>;
export type AccountData = z.infer<typeof AccountDataSchema>;

// Wakeup feature types (read from filesystem via Rust)
export interface WakeupTriggerRecord {
  timestamp: string;        // ISO timestamp of trigger
  success: boolean;
  email?: string;
  model?: string;
  error?: string;
  durationMs?: number;
}

export interface WakeupConfig {
  enabled: boolean;
  schedule?: {
    type: "interval" | "daily" | "custom";
    intervalHours?: number;
    times?: string[];       // e.g. ["09:00", "17:00"]
    cronExpression?: string;
  };
  models?: string[];
  accounts?: string[];      // "all" or specific emails
  cooldownMinutes?: number;
}

export interface WakeupStatus {
  configured: boolean;
  config: WakeupConfig | null;
  history: WakeupTriggerRecord[];
}

export interface AppSettings {
  theme: "light" | "dark";
  autoRefreshInterval: "manual" | "30s" | "1m" | "5m";
}
