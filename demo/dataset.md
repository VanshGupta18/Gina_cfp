Here's your **`neurotic_gina_demo.csv`** — 1,200 rows, 29 columns, fully synthetic. ✅

---

## Data Dictionary

| Column | Description |
|---|---|
| `week_start` | ISO date (YYYY-MM-DD) of the Monday starting each week, spanning 24 weeks from 2024-01-01. |
| `customer_id` | Unique synthetic customer identifier (e.g. CUST-0001). |
| `account_id` | Account grouping identifier; multiple customers can share an account (e.g. ACC-010). |
| `region` | Geographic sales region: North, South, East, or West. |
| `country` | 2-letter country code tied to region (US, CA, MX). |
| `full_name` | **[PII]** Synthetic customer full name. |
| `email` | **[PII]** Synthetic customer email address. |
| `phone` | **[PII]** Synthetic customer phone number. |
| `billing_address` | **[PII]** Synthetic street address, city, and country. |
| `support_note` | **[PII – unstructured]** Free-text support note; ~15% of rows embed a raw email or phone number in the text to test unstructured PII detection. |
| `segment` | Customer segment: SMB, MidMarket, or Enterprise. |
| `plan_tier` | Subscription plan: Basic, Pro, or Enterprise (Pro/Enterprise have higher per-subscriber revenue). |
| `acquisition_channel` | How the customer was acquired: Search, Paid Social, Partner, Referral, or Email. Partner yields lower churn; Paid Social yields higher churn. |
| `product_line` | Product purchased: ProductA or ProductB. |
| `website_sessions` | Integer count of website sessions in the week. |
| `trials_started` | Integer count of free trials started in the week. |
| `new_subscribers` | Integer count of new paid subscribers acquired in the week. |
| `active_subscribers` | Integer count of currently active paid subscribers at week-end. |
| `churned_subscribers` | Integer count of subscribers who cancelled during the week. Elevated for SMB in weeks 9–12. |
| `gross_revenue_usd` | Total billed revenue before refunds or discounts. |
| `refunds_usd` | Dollar value of refunds issued; outlier spike in East region at week 18. |
| `discounts_usd` | Dollar value of discounts/coupons applied. |
| `net_revenue_usd` | `gross_revenue_usd − refunds_usd − discounts_usd`; drops ~10–15% in weeks 9–12 due to South marketing cuts + SMB churn. |
| `marketing_spend_usd` | Dollars spent on marketing; deliberately reduced in South region during weeks 9–12. |
| `support_tickets` | Integer count of support tickets opened in the week; spikes in week 15 for ProductB/East. |
| `complaints` | Integer count of formal complaints; sharp spike in week 15 for ProductB/East. |
| `csat_score` | Customer satisfaction score, 1.0–5.0; lower during the week-15 complaints spike. |
| `nps_score` | Net Promoter Score, –100 to 100 integer. |
| `avg_handle_time_seconds` | Average support ticket handle time in seconds. |

---

## Built-in story triggers

| Story | What's in the data |
|---|---|
| **Revenue drop (weeks 9–12)** | `net_revenue_usd` falls ~10–15% driven by `marketing_spend_usd` cut in **South** + elevated `churned_subscribers` in **SMB** |
| **Complaints spike (week 15)** | Sharp rise in `complaints` + `support_tickets` for `ProductB` in **East** region; `csat_score` drops |
| **Plan tier effect** | Enterprise/Pro plan rows carry 2–4.5× the per-subscriber revenue vs Basic |
| **Channel churn difference** | Partner channel has ~40% lower churn rate than Paid Social |
| **Refund outlier** | East region in week 18 has unusually high `refunds_usd` (18–25% of gross) |
| **Unstructured PII** | ~15% of `support_note` values contain a raw email or phone number embedded in prose |