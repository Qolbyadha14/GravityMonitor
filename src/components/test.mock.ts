import { AccountData } from "../types";

export const mockAccounts: AccountData[] = [
  {
    email: "healthy@gmail.com",
    isActive: true,
    status: "valid",
    tokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    cachedSnapshot: {
      timestamp: new Date().toISOString(),
      method: "google",
      email: "healthy@gmail.com",
      planType: "Gemini 2.0 Pro",
      models: [
        { label: "Gemini 2.0 Flash", modelId: "gemini-2.0-flash", remainingPercentage: 0.85, isExhausted: false, isAutocompleteOnly: false },
        { label: "Gemini 1.5 Pro", modelId: "gemini-1.5-pro", remainingPercentage: 0.90, isExhausted: false, isAutocompleteOnly: false },
      ],
    },
    quotaSummary: {
      groups: [
        {
          displayName: "Gemini Models",
          buckets: [
            { bucketId: "5h", displayName: "Five Hour Limit Remaining", window: "5h", remainingFraction: 0.88, resetTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
            { bucketId: "weekly", displayName: "Weekly Limit Remaining", window: "weekly", remainingFraction: 0.92, resetTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() },
          ],
        },
      ],
    },
  },
  {
    email: "caution@gmail.com",
    isActive: false,
    status: "expired",
    tokenExpiresAt: Date.now() + 15 * 60 * 1000,
    cachedSnapshot: {
      timestamp: new Date().toISOString(),
      method: "google",
      planType: "Gemini 2.0 Pro",
      models: [
        { label: "Gemini 2.0 Flash", modelId: "gemini-2.0-flash", remainingPercentage: 0.22, isExhausted: false, isAutocompleteOnly: false },
      ],
    },
    quotaSummary: {
      groups: [
        {
          displayName: "Gemini Models",
          buckets: [
            { bucketId: "5h", displayName: "Five Hour Limit Remaining", window: "5h", remainingFraction: 0.18, resetTime: new Date(Date.now() + 1.5 * 60 * 60 * 1000).toISOString() },
            { bucketId: "weekly", displayName: "Weekly Limit Remaining", window: "weekly", remainingFraction: 0.45, resetTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString() },
          ],
        },
      ],
    },
  },
  {
    email: "critical@gmail.com",
    isActive: false,
    status: "invalid",
    tokenExpiresAt: Date.now() - 1000,
    cachedSnapshot: {
      timestamp: new Date().toISOString(),
      method: "local",
      planType: "Free",
      models: [
        { label: "Gemini 1.5 Flash", modelId: "gemini-1.5-flash", remainingPercentage: 0, isExhausted: true, isAutocompleteOnly: false },
      ],
    },
    quotaSummary: {
      groups: [
        {
          displayName: "Gemini Models",
          buckets: [
            { bucketId: "5h", displayName: "Five Hour Limit Remaining", window: "5h", remainingFraction: 0, resetTime: new Date(Date.now() + 30 * 60 * 1000).toISOString() },
            { bucketId: "weekly", displayName: "Weekly Limit Remaining", window: "weekly", remainingFraction: 0.05, resetTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
          ],
        },
      ],
    },
  },
  {
    email: "healthy2@gmail.com",
    isActive: false,
    status: "valid",
    tokenExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    cachedSnapshot: {
      timestamp: new Date().toISOString(),
      method: "google",
      planType: "Claude Pro",
      models: [
        { label: "Claude 3.5 Sonnet", modelId: "claude-3.5-sonnet", remainingPercentage: 0.75, isExhausted: false, isAutocompleteOnly: false },
      ],
    },
    quotaSummary: {
      groups: [
        {
          displayName: "Claude and GPT models",
          buckets: [
            { bucketId: "5h", displayName: "Five Hour Limit Remaining", window: "5h", remainingFraction: 0.72, resetTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() },
            { bucketId: "weekly", displayName: "Weekly Limit Remaining", window: "weekly", remainingFraction: 0.80, resetTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString() },
          ],
        },
      ],
    },
  },
  {
    email: "caution2@gmail.com",
    isActive: false,
    status: "valid",
    tokenExpiresAt: Date.now() + 3 * 60 * 1000,
    cachedSnapshot: {
      timestamp: new Date().toISOString(),
      method: "google",
      planType: "Free",
      models: [
        { label: "Gemini 1.5 Flash", modelId: "gemini-1.5-flash", remainingPercentage: 0.30, isExhausted: false, isAutocompleteOnly: false },
      ],
    },
    quotaSummary: {
      groups: [
        {
          displayName: "Gemini Models",
          buckets: [
            { bucketId: "5h", displayName: "Five Hour Limit Remaining", window: "5h", remainingFraction: 0.28, resetTime: new Date(Date.now() + 45 * 60 * 1000).toISOString() },
            { bucketId: "weekly", displayName: "Weekly Limit Remaining", window: "weekly", remainingFraction: 0.55, resetTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
          ],
        },
      ],
    },
  },
  {
    email: "healthy3@gmail.com",
    isActive: false,
    status: "valid",
    tokenExpiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
    cachedSnapshot: {
      timestamp: new Date().toISOString(),
      method: "google",
      planType: "Gemini 2.0 Pro",
      models: [
        { label: "Gemini 2.0 Flash", modelId: "gemini-2.0-flash", remainingPercentage: 0.68, isExhausted: false, isAutocompleteOnly: false },
        { label: "Gemini 1.5 Pro", modelId: "gemini-1.5-pro", remainingPercentage: 0.71, isExhausted: false, isAutocompleteOnly: false },
      ],
    },
    quotaSummary: {
      groups: [
        {
          displayName: "Gemini Models",
          buckets: [
            { bucketId: "5h", displayName: "Five Hour Limit Remaining", window: "5h", remainingFraction: 0.65, resetTime: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString() },
            { bucketId: "weekly", displayName: "Weekly Limit Remaining", window: "weekly", remainingFraction: 0.73, resetTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() },
          ],
        },
      ],
    },
  },
];
