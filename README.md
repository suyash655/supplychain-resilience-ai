# Portfolio: Supply Chain Reliability & Risk Optimization (SynChain 2.0)

## 1. Executive Summary
**SynChain 2.0** is an analytics-driven case study designed to quantify supplier reliability and mitigate cost volatility for mid-sized logistics networks. This project demonstrates end-to-end data analyst capabilities: from SQL-driven insights and KPI design to interactive dashboarding and predictive trend forecasting.

---

## 2. The Business Problem
A growing logistics SME faced increasing fulfillment delays and unpredictable supplier price hikes during peak seasons. Without a centralized risk-assessment framework, procurement teams were reactive rather than proactive.

**Objective:** Develop a data-driven "Supplier Intelligence" suite to:
- Quantify supplier risk using weighted KPIs.
- Identify regional bottlenecks and seasonal delay trends.
- Enable $X savings by shifting volume to high-stability, low-cost vendors.

---

## 3. Tech Stack & Analytics Tools
- **SQL (PostgreSQL/SQLAlchemy):** Core analytical engine for cohort analysis and cohort aggregation.
- **Python (Pandas, Scipy, NumPy):** Automated data cleaning, Z-Score anomaly detection, and seasonality forecasting.
- **FastAPI:** Backend orchestration for real-time analytics serving.
- **Next.js/React:** Interactive dashboards for executive health overviews.

---

## 4. Key Analytical Insights
- **The 80/20 Rule:** Identified that **12% of suppliers** were responsible for **68% of total network delays**.
- **Regional Heat:** The 'SouthEast' region exhibited **45% higher cost volatility** than the national average.
- **Seasonality:** Detected a structural **22% surge in delays** starting mid-November, enabling proactive inventory buffering.

---

## 5. SQL Analysis Examples
The project utilizes advanced SQL (CTEs, Window Functions) to extract business value. See the full [Case Study](./PROJECT_DETAILS.md) for detailed logic on:
- **Supplier Performance Cohorts:** Identifying MoM delay deltas.
- **Rolling Averages:** 7-day smoothed monitoring of fulfillment health.
- **Pareto Analysis:** Quantifying the total delay impact by supplier tier.

---

## 6. How to Run the Analysis suite
### Backend (Analytics Engine)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Frontend (Dashboard)
```bash
npm install
npm run dev
```

---

## 7. Contact & Professional Summary
This project showcases the analytical rigor required for **Data Analyst, Business Analyst, and Analytics Engineer** roles. It prioritizes business intuition and quantified impact over model complexity.
