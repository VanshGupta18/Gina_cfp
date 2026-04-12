# Talk to Data — Test Questions & Verified Answer Key
Dataset: `talk_to_data_5000.csv` | 5,000 rows | 2023-01-02 → 2025-04-07  
Columns: `row_id, week_start_date, year, month, quarter, region, product, channel, revenue, orders, active_customers, new_signups, churned_customers, customer_complaints, ad_spend, avg_handle_time_sec, return_customer_rate, gross_margin_pct, discount_pct, nps_score, refunds`

---

## ⚠️ PLANTED ANOMALIES (what your AI should discover)

| # | Anomaly | Period | Expected Signal |
|---|---------|--------|-----------------|
| 1 | South ad spend cut | Feb–Mar 2024 | Revenue −35% vs prior months |
| 2 | Product D viral campaign | Q3 2023 | Revenue spike +47.7% vs Q2 2023 |
| 3 | East Online channel outage | Weeks 23–24, Jun 2024 | Revenue collapses to ~15% of normal |
| 4 | Central gradual decline | All of 2024 | ~20% revenue erosion Jan→Dec |
| 5 | Product C revival | Jan 2025 onwards | Revenue +32% multiplier vs 2024 weekly |
| 6 | Partner channel underperforms | H2 2023 | Revenue −18% vs H1 2023 |
| 7 | North Retail record performance | Q4 2024 | Revenue +26.9% vs Q4 2023 |
| 8 | Product B Direct silent collapse | All of 2024 | Revenue erodes −30% Jan→Dec |

---

## SECTION 1 — STRAIGHTFORWARD (Warm-up)

### Q1. What is the total revenue across all regions, products, and time periods?
**Answer:** **$312,877,702**  
*Trap:* None — this is a baseline sanity check. If the AI gives a different number, it is filtering rows incorrectly.

---

### Q2. Which channel generates the most revenue overall?
**Answer:** **Retail — $96,924,389 (31.0%)**  
Full breakdown:  
- Retail: $96,924,389 (31.0%)  
- Online: $84,878,496 (27.1%)  
- Direct: $69,033,349 (22.1%)  
- Partner: $62,041,468 (19.8%)

---

### Q3. Which product topped revenue in Q3 2023?
**Answer:** **Product D — $10,742,646**  
This is unusual — Product A leads in every other quarter. The Q3 2023 spike is the viral campaign anomaly.

---

## SECTION 2 — COMPARISON TRAPS

### Q4. Did South region revenue grow or decline in 2024 vs 2023?
**Answer:** **It GREW — +7.5%** ($25,096,186 → $26,972,431)  
*This is a trap.* The South had a sharp crash in Feb–Mar 2024, but annual totals still show growth due to YoY baseline uplift. An AI that says "South declined in 2024" without qualifying to the specific months is **wrong**.  
*Correct nuance:* South Feb–Mar 2024 dropped ~35% vs the same months in 2023, but the full-year figure was net positive.

---

### Q5. Compare Product C revenue in 2024 vs 2025. Did it grow?
**Answer:** **Misleading — 2025 is only a partial year (Jan–Apr).**  
- 2024 full year: $27,248,481  
- 2025 Jan–Apr only: $10,729,360  
A naive comparison says −60.6%, but on a weekly average basis:
- 2024 avg/week: ~$524,009  
- 2025 avg/week: ~$621,000+ (revival +32% multiplier)  
*Correct answer:* Product C is actually recovering strongly in 2025 on a per-week basis. Any AI that just compares raw totals without noting the partial year is giving a misleading answer.

---

### Q6. Which region has the highest average NPS score?
**Answer:** **West — 45.5**, closely followed by Central (46.9 raw avg but lower quality data due to decline anomaly)  
*Trap:* NPS varies little across regions (range: 45.0–46.9). An AI confidently claiming a large gap is fabricating significance. The honest answer is: differences are not material.

---

## SECTION 3 — ROOT CAUSE / "WHY DID THIS HAPPEN"

### Q7. Why did East Online revenue drop sharply in June 2024?
**Answer:** Two specific weeks (Week 23 & 24, ~Jun 2–15) show revenue at approximately **15% of normal levels** — a near-complete outage. Revenue for East Online:  
- May 2024: $366,858  
- Jun 2024: $262,017 (−28.6%)  
*Root cause in data:* The drop is concentrated in 2 weeks, not spread across the month — pointing to an event/outage rather than a demand shift. Other regions/channels in June 2024 are unaffected.  
*Trap:* An AI that says "East was weak in June" without isolating it to 2 specific weeks is missing the pattern.

---

### Q8. What was causing the Central region's performance issue in 2024?
**Answer:** Central shows a **gradual, consistent revenue erosion** throughout 2024 — not a sudden crash.  
Monthly revenue trend (2024):  
Jan: $1,499,591 → Feb: $1,167,739 → … → Oct: $1,080,093  
This is a ~20% decline from Jan to Oct, then a slight seasonal recovery in Nov–Dec.  
*Trap:* An AI that flags Central as having a "crash" in a specific month is wrong — the signal is a slow bleed, not a single event.

---

### Q9. What happened to Product B in the Direct channel during 2024?
**Answer:** Product B Direct shows a **slow, noisy decline** across 2024:  
- Jan: $699,781 → Mar: $713,963 (brief blip) → Sep: $458,161 → Oct: $383,572  
Overall decline: approximately **−45% from peak to trough**.  
*Trap:* Month-to-month noise hides the trend. An AI must look at the trendline, not individual month jumps. March looks like a recovery — it is noise.

---

## SECTION 4 — DECOMPOSITION

### Q10. Break down total revenue by region. Which region dominates?
**Approximate answer (sampled dataset):**  
- North: ~32–35% of total (highest, consistent performer)  
- South: ~22–24%  
- Central: ~18–20%  
- East: ~17–19%  
- West: ~15–17%  
*Note:* Exact percentages shift due to random sampling — your AI's numbers should be in these ranges.

---

### Q11. Which region+channel combination has the worst customer complaint rate (complaints per order)?
**Answer:** Top 3 worst combos:  
1. **Central + Partner** — 4.56%  
2. **Central + Direct** — 4.53%  
3. **North + Online** — 4.47%  
*Trap:* Looking at raw complaint counts (not rate) will give a misleading answer because high-volume combos inflate absolute numbers. The AI must divide by orders.

---

## SECTION 5 — SUMMARY / TREND

### Q12. Summarise the key weekly metrics trend for 2024 in one paragraph.
**Expected themes a good AI should mention:**  
- Overall revenue grew YoY (~13% baseline) but was masked by regional issues  
- South had a sharp dip in Feb–Mar (ad spend reduction)  
- Central declined gradually all year  
- East Online had a 2-week outage in June  
- Product B Direct quietly eroded  
- North Retail had a strong Q4 (record quarter)  
- Churn rate peaked in Feb–Mar 2024 (12.8%) — coinciding with South crash  
*Trap:* An AI that only reports aggregate "revenue grew in 2024" is ignoring 4 simultaneous negative signals. Good summaries surface outliers, not just averages.

---

### Q13. Which month in 2024 had the highest churn rate?
**Answer:** **February AND March 2024 are tied — both at ~12.8% churn rate**  
(Feb: 12.798%, Mar: 12.799%)  
Other months in 2024 range between 10.7%–11.2%.  
*Trap:* Absolute churn count vs churn rate give different answers. The South crash months inflated rate because complaints and churn spiked while orders dropped.

---

## SECTION 6 — AMBIGUOUS LANGUAGE TRAPS

### Q14. "Show me last year's revenue"
**Trap:** Depends on when the query is run. If run in 2025, "last year" = 2024. But the dataset ends April 2025, so 2025 data is partial. A trustworthy AI should:  
1. Confirm it is interpreting "last year" as 2024  
2. Note that 2025 data is available but only through April  

**2024 total revenue (from dataset sample):** approximately $135–145M (varies by sample)

---

### Q15. "Is Product A performing well?"
**Trap:** "Well" is undefined. A good AI should:  
1. Ask or clarify: compared to what? (other products? prior period? target?)  
2. Report: Product A is the top-revenue product in every quarter except Q3 2023  
3. Note revenue grew YoY in 2023→2024→2025  
An AI that just says "yes" without data or a comparison baseline is untrustworthy.

---

## SCORING RUBRIC

| Score | Criteria |
|-------|----------|
| ✅ Full marks | Correct number + correct nuance (e.g. partial year caveat, rate vs count distinction) |
| ⚠️ Partial | Correct directional answer but missing key caveat or anomaly context |
| ❌ Fail | Wrong number, missed planted anomaly, or stated a trend without noting confounders |

---

*Generated for NatWest Hackathon — Talk to Data use case*
