# Live Demo Questions (neurotic_gina_demo.csv)

Use these during the 5‑minute recording to hit **Clarity / Trust / Speed** + the 4 hackathon use-cases.

## Pre-flight (avoid caching issues)
- Prefer slightly unique wording per question (or include a date/week), *or* disable caches via backend env: `DISABLE_RESPONSE_CACHE=true` and `DISABLE_NARRATION_CACHE=true`.
- While streaming, keep the **pipeline/trace** visible for the “Speed” pillar.
- When the result lands, always do the **Trust triad**: (1) citation chips, (2) expand SQL, (3) show the result table via Insights.

---

## Q1 — Understand what changed (driver explanation)
**Ask:**
- "Why did net revenue drop around weeks 9 to 12?"

**What to show:**
- Pipeline steps streaming
- Final narrative + chart
- Expand SQL
- Citation chips (expect: `net_revenue_usd`, `marketing_spend_usd`, `churned_subscribers`, `region`, `segment`)

**Expected story in this dataset:**
- Net revenue drops ~15–17% in weeks 9–12 vs weeks 5–8
- South marketing spend is cut sharply (~50%+)
- SMB churn rate roughly doubles

---

## Q2 — Breakdown / decomposition (table + chart)
**Ask:**
- "Break down net revenue by region and plan tier for week starting 2024-03-11."

**What to show:**
- Chart/table output
- Open Insights panel → table view
- Expand SQL + citations

---

## Q3 — Compare (consistent metric)
**Ask:**
- "Compare churn rate between Paid Social and Partner over the last 4 weeks."

**What to show:**
- Explanation of the metric (churn rate = churned / active)
- A simple comparison chart/table
- SQL disclosure

**Expected story in this dataset:**
- Partner has materially lower churn than Paid Social

---

## Q4 — Spike investigation (trust + specificity)
**Ask:**
- "What caused complaints to spike in the week starting 2024-04-08?"

**What to show:**
- Narrative identifying **ProductB** + **East** as main contributors
- Breakdown chart/table to prove it
- SQL panel + citations

---

## Optional (PII shield demonstration — safe framing)
Only do this if the UI clearly redacts/blocks sensitive fields.

**Ask (safe):**
- "Which columns contain PII and how are they handled during analysis?"

**Avoid asking:**
- Requests that force the model to print emails/phones/addresses.
