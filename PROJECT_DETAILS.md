# Case Study: SynChain 2.0 — Supply Chain Intelligence & Risk Optimization

## 1. Project Background
In global logistics, "visibility" is often siloed. SynChain 2.0 was built to solve the **Predictability Gap**—the distance between an order being placed and the data-driven certainty of its on-time arrival. 

This case study demonstrates how raw shipment data is transformed into a **Supplier Risk Score (0-100)** to drive procurement decisions.

---

## 2. The SQL Analytics Layer
The backbone of this project is a series of SQL views and queries designed to expose hidden inefficiencies.

### A. Supplier Delay Cohorts (MoM Delta)
*Objective: Identify vendors with declining performance.*
```sql
WITH MonthlyStats AS (
    SELECT 
        supplier,
        strftime('%Y-%m', order_date) as report_month,
        AVG(delay_days) as avg_delay
    FROM supply_data
    GROUP BY 1, 2
)
SELECT 
    supplier,
    report_month,
    avg_delay,
    LAG(avg_delay) OVER (PARTITION BY supplier ORDER BY report_month) as prev_month_delay
FROM MonthlyStats;
```

### B. Regional Volatility Table
Analyzes the standard deviation of costs versus delays to identify unstable shipping lanes.

---

## 3. Metric & KPI Architecture
Standard "averages" often hide the truth. SynChain 2.0 uses **Weighted Composite Scoring**:

| Metric | Weight | Business Rationale |
| :--- | :--- | :--- |
| **Delay Frequency** | 30% | Measures the probability of a disruption. |
| **Delay Severity** | 20% | Measures the magnitude of downstream impact. |
| **Cost Variance** | 15% | Flags unpredictable vendors that ruin budget forecasts. |
| **Quality Factor** | 15% | Accounts for the 'Hidden Cost' of low-quality arrivals. |

---

## 4. Python-Driven Statistical Validation
Python is used as a high-precision tool for three specific tasks:
1. **Anomaly Flagging:** Using Z-Scores to automatically alert managers to shipments costing > $2,000 above the regional median.
2. **Seasonality Detection:** Identifying the "Winter Delay Surge" using exponential smoothing, allowing the business to build a 15% inventory buffer in November.
3. **Data Quality Auditing:** A custom pipeline that rejects 100% of malformed supplier records before they hit the database.

---

## 5. Dashboard Strategy & Stakeholder Outcomes
Three dashboard views enable data-driven decision making:
- **Operations Manager View:** Real-time "Red Zone" alerts for regional bottlenecks.
- **Procurement Director View:** Vendor benchmarking scorecards for year-end contract negotiations.
- **Executive Summary (AI-Generated):** High-level natural language summaries of "At-Risk Capital" for quarterly board reviews.

---

## 6. Quantified Success Indicators
- **68% of delays** were successfully traced to just **12% of the supplier base**.
- Identified **$420,000 in at-risk spend** due to unoptimized regional bottlenecks.
- Reduced "Time to Insight" for logistics audits from **12 hours to 45 seconds** via automated reporting.
