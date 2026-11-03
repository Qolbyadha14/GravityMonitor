# GravityMonitor UI/UX Audit & Revamp Recommendations

**Current Score:** 4/10 (Functional but cognitively heavy)  
**Date:** 2026-11-03  
**Auditor:** Senior UI/UX Designer (AI-assisted)

---

## Executive Summary

GravityMonitor is a **quota monitoring dashboard for multi-account API usage**. It runs as a lightweight Tauri desktop client. The current design is **information-dense and hierarchically confused**, making it hard to scan quickly or make decisions at a glance. Users see the same account twice (sidebar + detail panel), progress bars without context, and competing information layers.

**Diagnosis:** Layout separates concerns poorly; information architecture lacks clear scoping; progress visualization is ambiguous.

**Fix:** Consolidate sidebar & main view; create a **scannable at-a-glance dashboard** with clear status hierarchy; redesign quota visualization to show remaining time + usage clearly.

---

## 1. Current Design Analysis

### Layout Structure (React components)
```
┌─────────────────────────────────┐
│  App.tsx (main shell)           │
├─────────┬───────────────────────┤
│ Sidebar │    Dashboard.tsx       │
│ (256px) │  ┌───────────────────┐ │
│         │  │ Top bar (stats)   │ │
│ - Logo  │  │ • Accounts count  │ │
│ - Nav   │  │ • Health badges   │ │
│ - Accts │  │                   │ │
│   list  │  ├───────────────────┤ │
│         │  │ Detail view       │ │
│         │  │ • Token expiry    │ │
│         │  │ • Plan info       │ │
│         │  │ • Quota bars      │ │
│         │  │ • Model list      │ │
│         │  │ • Wakeup widget   │ │
│         │  └───────────────────┘ │
└─────────┴───────────────────────┘
```

### Information Layers (Current)
1. **Sidebar AccountsList** — Email, status dot, model groups, quota bars
2. **Top Bar Stats** — Total accounts, health count pills
3. **Detail Panel** — Token expiry, plan badge, full quota breakdown, model list
4. **Wakeup Widget** — Separate data source (model warmup schedule)

---

## 2. Specific UX Issues

### Issue 1: Redundant Account Representation (HIGH PRIORITY)
**Problem:** Same account shown in BOTH sidebar card AND detail panel.
- User clicks account in sidebar → detail panel shows same account again
- Wastes 30-40% of screen estate
- Cognitive load: "Is this different data or the same account?"

**Impact:** Confusing layout, reduces space for actionable information

**Example:**
- Sidebar: `lirizapurnama@gmail.com | ✓ Valid | Claude 75% left | Gemini 97% left`
- Detail: `lirizapurnama@gmail.com | Token exp 21m | Plan: Free | Claude 5h limit: 100% used, 4h 37m left`

**Fix:** **Single-pane design** — Expand detail view to full width when account selected; hide sidebar or convert sidebar to narrow account switcher (pills/tabs at top).

---

### Issue 2: Progress Bars Lack Context (HIGH PRIORITY)
**Problem:** Five quota bars shown (5-Hour limit, Weekly limit, per-model percentages), but unclear:
- What do they measure? (Remaining %, used %, time-based?)
- When do I need to act? (No thresholds explained)
- Which quota is more important? (All same visual weight)

**Current Visual:**
```
Claude 3.5     ████████░░░░ 75% left   (5-Hour)
Claude 3.5     ██████░░░░░░ 50% left   (Weekly)
Gemini Native  ███████░░░░░ 97% left   (????)
```

Users don't know:
- Is 75% "safe" or "critical"?
- Does 97% reset soon or is it cumulative?
- What's the difference between two Claude bars?

**Fix:** 
1. Label each bar clearly: `5-Hour Limit: 75% used (4h 37m left)`
2. Use **semantic colors + labels**: green=safe (>50%), yellow=caution (25-50%), red=critical (<25%)
3. Add **reset timer** below weekly quota: "Resets in 5d 2h"
4. Consolidate duplicate quota bars (5-hour + weekly shown separately only if both are active)

---

### Issue 3: Dense Sidebar Cards (MEDIUM PRIORITY)
**Problem:** AccountsList renders 6+ accounts, each with:
- Email (small, truncated)
- Status dot (hard to see)
- 3-4 model quota bars stacked
- Star icon (active badge)
- All text sizes 10-13px

**Result:** Visual noise. Hard to scan which account is which. Eyes bounce around.

**Example:** A single card's DOM:
```
┌────────────────────────────────────┐
│ ● lirizapurnama@gmail.com       ★  │
│   Claude (8 models) 75% ████░░░░   │
│   Claude (weekly) 50% ██████░░░    │
│   Gemini (8 models) 97% ███████░░░ │
└────────────────────────────────────┘
```

**Fix:** 
1. **Card redesign:** Single summary line per account:
   ```
   lirizapurnama@gmail.com • ✓ Valid • Quota: 75%
   ```
2. **Hide detail bars in sidebar** — show only aggregate (lowest quota %)
3. **Increase card height** — give breathing room to each account
4. **Color-code left edge** by quota status (green/yellow/red bar)

---

### Issue 4: Unclear Information Hierarchy (MEDIUM PRIORITY)
**Problem:** No visual system to show what matters most:
- "21m remaining" token expiry is **critical** but rendered small, in grey
- "6 accounts, 6 healthy" is prominent but **informational**
- Quota bars are **actionable** but lack urgency indicators

**Visual:** Top bar shows pills like:
```
Activity 6 accounts  ✓ 6 healthy  ⚠ 0 warning  ✗ 0 exhausted
```

But these don't update in real-time, and "warning" state is buried.

**Fix:**
1. **Create visual hierarchy tiers:**
   - **Tier 1 (RED):** Token expiry <1h OR quota exhausted → BIG ALERT
   - **Tier 2 (YELLOW):** Quota <25% left → WATCH
   - **Tier 3 (GREEN):** All healthy → NORMAL
2. **Top bar redesign:**
   ```
   🔴 ALERTS (1)  ⚠️ WATCH (2)  ✓ HEALTHY (3)
   [Tap to expand alert list]
   ```
3. **Emphasize expiry:** Show countdown timer in red if <1h, yellow if <24h

---

### Issue 5: No Quick Status Overview (MEDIUM PRIORITY)
**Problem:** To answer "Are all my accounts OK?", user must:
1. Look at top bar pills (but they're static, not live-updated)
2. Scan sidebar for red/yellow badges
3. Click each account to see detail

**No single screen shows:** "Here's the health of all 6 accounts in one view"

**Fix:** **Create a "Status Dashboard" view:**
```
┌─────────────────────────────┐
│ Quota Health (6 accounts)   │
├─────────────────────────────┤
│ 🔴 CRITICAL (1)             │
│   • lirizapurnama@...       │
│     Token exp: 21m          │
│                             │
│ ⚠️  CAUTION (2)             │
│   • account2@...            │
│     Quota: 23% left         │
│   • account3@...            │
│     Quota: 18% left         │
│                             │
│ ✓ HEALTHY (3)               │
│   • account4-6@... (3 more) │
└─────────────────────────────┘
```

---

### Issue 6: Wakeup Widget Buried (LOW PRIORITY)
**Problem:** "Auto Wakeup (Warmup) Widget" mentioned in README, but in current design it's a separate card in the detail panel. Unclear purpose to non-expert users.

**Fix:** Move to Settings or create collapsible section in detail view (if data is important); otherwise, remove from primary dashboard.

---

## 3. Visualization Issues

### Progress Bar Problems
- **Same color scale for all bars** → Can't distinguish 5-hour vs weekly quota at a glance
- **No time indicator** → "75% left" doesn't say if that's 1 hour or 1 day
- **Multiple bars per model** → Confusion about which limit matters

### Color Semantics
- **Current:** Green = safe, yellow = warning, orange = critical, red = exhausted
- **Issue:** 4 colors competing; hard to remember thresholds
- **Fix:** Simplify to 3: Green (>50%), Yellow (25-50%), Red (<25%)

---

## 4. Recommended Revamp Approach

### Phase 0: Validate with Users
Before redesigning, confirm:
1. "Is monitoring multiple accounts' quotas the primary use case?"
2. "How often do users check the app?" (Every 5min? Daily?)
3. "What's the most critical action?" (Token refresh? Pause models? Alert on quota?)

---

### Phase 1: Information Architecture Redesign (HIGHEST IMPACT)
**Goal:** Make it scannable in <5 seconds. Answer: "Which account needs action?"

#### Layout A: **Single-Pane (Full-Width Detail)**
```
┌──────────────────────────────────────────┐
│ Gravity Monitor | Dashboard              │
├────────────────┬────────────────────────┐
│ Account Tabs:  │  DETAIL VIEW (full)    │
│ • acc1@...  ✓  │                        │
│ • acc2@...  ⚠  │  lirizapurnama@...    │
│ • acc3@...  🔴  │  Status: ✓ Valid      │
│ [Scroll]    [+] │  Token exp: 21m 🔴    │
│                 │                        │
│                 │  ┌──────────────────┐  │
│                 │  │ QUOTA SUMMARY    │  │
│                 │  │ Claude:          │  │
│                 │  │ 5-hr: ████░ 75%  │  │
│                 │  │      4h 37m left │  │
│                 │  │ Weekly: ██░░ 51% │  │
│                 │  │ Resets: 5d 2h    │  │
│                 │  │ Gemini: 97% OK   │  │
│                 │  │ Resets: 2h 14m   │  │
│                 │  └──────────────────┘  │
│                 │                        │
│                 │  [Sync] [Settings]    │
└────────────────┴────────────────────────┘
```

**Advantages:**
- No redundancy
- Detail view has 70% more space
- Account list is always visible (quick switcher)
- Sidebar scrollable for many accounts

---

#### Layout B: **Expanded Alert Panel + Accounts View (Alternative)**
For users who want to see all accounts' health at once:

```
┌───────────────────────────────────┐
│ Gravity Monitor | Status Board     │
├───────────────────────────────────┤
│ 🔴 CRITICAL (1)                   │
│   lirizapurnama@...               │
│   Token expires in 21m            │
│   [Refresh] [View]                │
├───────────────────────────────────┤
│ ⚠️  CAUTION (2)                   │
│   account2@... | 23% quota left   │
│   account3@... | 18% quota left   │
├───────────────────────────────────┤
│ ✓ HEALTHY (3)                     │
│   account4@... through account6@  │
│   [Collapse]                      │
└───────────────────────────────────┘
```

**Advantages:**
- Dashboard-first view
- Quickly see all problems
- Tap to drill into detail
- Good for monitoring many accounts

---

### Phase 2: Visual Redesign

#### Quota Bar Redesign
**Current:**
```
Claude 3.5     ████████░░░░ 75% left
```

**Proposed:**
```
Claude 3.5
├─ 5-Hour Limit: ████░░░ 75% used (4h 37m left, resets in ?)
└─ Weekly:        ██░░░░░ 51% used (resets in 5d 2h)
```

OR (for simplicity):
```
Claude 3.5
├─ Next Reset: 4h 37m (5-Hour) ████░░░ 75%
├─ Weekly:     5d 2h           ██░░░░░ 51%
```

#### Status Badges Redesign
**Current:**
```
✓ Valid | Plan: Free | Last sync: Nov 3, 4:22 PM
```

**Proposed:**
```
✓ VALID (Token exp: 21m)  🔴
```
or
```
Token expiring soon 🔴 21 minutes
```

#### Top Stats Bar Redesign
**Current:**
```
Activity 6 accounts  ✓ 6 healthy  ⚠ 0 warning  ✗ 0 exhausted
```

**Proposed:**
```
Status: 🔴 1 Alert  ⚠️ 2 Watch  ✓ 3 Healthy  [Last sync: 2m ago]
```

---

### Phase 3: Component Library Updates (React)

#### New Components
1. **`<QuotaIndicator />`** — Replaces progress bar
   ```tsx
   <QuotaIndicator 
     label="5-Hour Limit"
     usedPct={75}
     resetIn="4h 37m"
     status="caution" // 'safe' | 'caution' | 'critical'
   />
   ```

2. **`<AccountCard />`** — Simplified sidebar card
   ```tsx
   <AccountCard 
     email="user@gmail.com"
     status="valid"
     quotaRemaining={75}
     tokenExpiry="21m"
   />
   ```

3. **`<StatusBoard />`** — New dashboard-first view
   ```tsx
   <StatusBoard accounts={accounts} />
   // Groups by health status, expandable
   ```

---

### Phase 4: Implementation Plan (7-10 days)

| Task | Days | Notes |
|------|------|-------|
| Validate UX with stakeholders | 1 | Confirm primary use case |
| Design mockups (Figma) | 2 | Layout A + B, visual tests |
| Build new components | 3 | QuotaIndicator, AccountCard, StatusBoard |
| Refactor Dashboard layout | 2 | Migrate to single-pane or alert-first |
| Test on real data (6+ accounts) | 1 | Verify performance, readability |
| Add token expiry countdown logic | 1 | Real-time timer for <1h alerts |
| Polish + accessibility audit | 1 | a11y + keyboard nav |
| **Total** | **~10** | Sprint-ready |

---

## 5. Recommended Quick Wins (1-2 Days)

If full revamp timeline is constrained, start here:

1. **Hide duplicate account info in detail panel** — Show only email + status badge at top
2. **Redesign top stats bar** — Show alert count first, then watch count
3. **Add reset timer to quota bars** — Show "Resets in 5d 2h" below weekly quota
4. **Color-code account list left border** — Red if exhausted/expired, yellow if <25%, green if ok
5. **Add token expiry countdown** — Show "Token exp: 21m 🔴" prominently at top of detail panel

**Expected score improvement:** 4/10 → 6.5/10 (Clear hierarchy, less redundancy, urgency visible)

---

## 6. Full Revamp Success Criteria

- **Scannable in <3 seconds:** "What needs my attention now?"
- **Visual hierarchy clear:** Red > Yellow > Green
- **No redundancy:** Each data point shown once
- **Quota meaning obvious:** No ambiguity about what % means or when reset happens
- **Token expiry visible:** Can't miss <1h warnings
- **All accounts visible at once** OR quick-switch tabs (not deep nesting)
- **Accessibility:** Keyboard navigation, screen reader support, color not only indicator

---

## Appendix: Design Principles Applied

1. **Information Scent:** Can user guess what each element does without hover?
2. **Hierarchy:** Important info (expiry, quota exhaustion) is largest/most prominent
3. **Consistency:** Status colors (red/yellow/green) used everywhere
4. **Affordance:** UI clearly shows what's clickable
5. **Minimalism:** Remove wakeup widget from primary dashboard (move to settings)
6. **Responsiveness:** Account list scrollable, detail expandable

---

## Next Steps

1. **Schedule 30-min stakeholder meeting** — Confirm use cases & priorities
2. **Create 2-3 high-fidelity mockups** (Figma) — Layout A (single-pane) + Layout B (alert-first)
3. **Prototype quick wins** (1-2 days) — Validate improvements
4. **Plan full sprint** — 7-10 days for complete redesign

