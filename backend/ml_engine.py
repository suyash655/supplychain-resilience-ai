"""
SynChain 2.0 — ML Engine
=========================
Anomaly detection, risk scoring, time-series forecasting, and predictive analytics.
Works entirely with scikit-learn, scipy, and numpy — no GPU required.
"""

import math
import numpy as np  # type: ignore
import pandas as pd  # type: ignore
from sklearn.ensemble import IsolationForest  # type: ignore
from sklearn.preprocessing import StandardScaler  # type: ignore
from scipy import stats  # type: ignore
from typing import Dict, List, Any, Optional
from datetime import datetime


def _safe(val: float, default: float = 0.0) -> float:
    """Return *default* when *val* is NaN, Inf, or None."""
    if val is None:
        return default
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (ValueError, TypeError):
        return default


class AnomalyDetector:
    """Multi-method anomaly detection engine."""

    def __init__(self, contamination: float = 0.1):
        self.contamination = contamination
        self.scaler = StandardScaler()

    def detect(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Run anomaly detection on supply chain data."""
        results: Dict[str, Any] = {
            "anomalies": [],  # type: List[Dict[str, Any]]
            "total_records": len(df),
            "anomaly_count": 0,
            "methods_used": [],
        }

        # Method 1: Isolation Forest on numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if len(numeric_cols) >= 2:
            iso_anomalies = self._isolation_forest(df, numeric_cols)
            results["anomalies"].extend(iso_anomalies)
            results["methods_used"].append("isolation_forest")

        # Method 2: Statistical Z-Score anomalies
        if "delay_days" in df.columns:
            z_anomalies = self._zscore_anomalies(df, "delay_days", "delay_spike")
            results["anomalies"].extend(z_anomalies)
            results["methods_used"].append("z_score_delay")

        if "cost" in df.columns:
            z_anomalies = self._zscore_anomalies(df, "cost", "cost_surge")
            results["anomalies"].extend(z_anomalies)
            results["methods_used"].append("z_score_cost")

        # Method 3: IQR-based outlier detection
        if "quality_score" in df.columns and df["quality_score"].notna().sum() > 10:
            iqr_anomalies = self._iqr_anomalies(df, "quality_score", "quality_drop")
            results["anomalies"].extend(iqr_anomalies)
            results["methods_used"].append("iqr_quality")

        results["anomaly_count"] = len(results["anomalies"])
        return results

    def _isolation_forest(self, df: pd.DataFrame, cols: List[str]) -> List[Dict]:
        """Isolation Forest multivariate anomaly detection."""
        anomalies = []
        X = df[cols].fillna(0).values
        if len(X) < 10:
            return anomalies

        X_scaled = self.scaler.fit_transform(X)
        model = IsolationForest(
            contamination=self.contamination,
            random_state=42,
            n_estimators=100
        )
        labels = model.fit_predict(X_scaled)
        scores = model.decision_function(X_scaled)

        for i, (label, score) in enumerate(zip(labels, scores)):
            if label == -1:
                row = df.iloc[i]
                anomalies.append({
                    "index": int(i),
                    "type": "multivariate_anomaly",
                    "severity": "high" if score < -0.3 else "medium",
                    "risk_score": round(min(100.0, max(0.0, _safe((1.0 - (score + 0.5)) * 100.0))), 1),  # type: ignore
                    "supplier": str(row.get("supplier", "Unknown")),
                    "sku": str(row.get("sku", "Unknown")),
                    "details": {col: _safe(row.get(col, 0)) for col in cols},
                })
        return anomalies

    def _zscore_anomalies(self, df: pd.DataFrame, col: str, event_type: str) -> List[Dict]:
        """Z-score based univariate anomaly detection."""
        anomalies = []
        values = pd.to_numeric(df[col], errors="coerce").fillna(0)
        std = _safe(values.std())
        if std == 0:
            return anomalies

        z_scores = np.abs(stats.zscore(values))
        threshold = 2.5

        for i, z in enumerate(z_scores):
            if z > threshold:
                row = df.iloc[i]
                anomalies.append({
                    "index": int(i),
                    "type": event_type,
                    "severity": "critical" if z > 4 else "high" if z > 3 else "medium",
                    "risk_score": round(min(100.0, z * 20.0), 1),  # type: ignore
                    "supplier": str(row.get("supplier", "Unknown")),
                    "sku": str(row.get("sku", "Unknown")),
                    "value": float(values.iloc[i]),
                    "z_score": round(float(z), 2),  # type: ignore
                })
        return anomalies

    def _iqr_anomalies(self, df: pd.DataFrame, col: str, event_type: str) -> List[Dict]:
        """IQR-based outlier detection."""
        anomalies = []
        values = pd.to_numeric(df[col], errors="coerce").dropna()
        Q1 = values.quantile(0.25)
        Q3 = values.quantile(0.75)
        IQR = Q3 - Q1
        lower = Q1 - 1.5 * IQR
        upper = Q3 + 1.5 * IQR

        for i, val in values.items():
            if val < lower or val > upper:
                row = df.iloc[i] if i < len(df) else {}
                anomalies.append({
                    "index": int(i),
                    "type": event_type,
                    "severity": "high" if val < (Q1 - 3 * IQR) or val > (Q3 + 3 * IQR) else "medium",
                    "risk_score": round(min(100.0, abs(val - values.median()) / max(float(IQR), 0.01) * 25.0), 1),  # type: ignore
                    "supplier": str(row.get("supplier", "Unknown")) if hasattr(row, "get") else "Unknown",
                    "value": float(val),
                })
        return anomalies


class RiskScorer:
    """Composite risk scoring engine for suppliers and SKUs."""

    WEIGHTS = {
        "delay_frequency": 0.30,
        "delay_severity": 0.20,
        "cost_variance": 0.15,
        "quality_factor": 0.15,
        "volume_reliability": 0.10,
        "consistency": 0.10,
    }

    def score_suppliers(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Compute 0–100 risk score for each supplier."""
        if "supplier" not in df.columns:
            return []

        results = []
        grouped = df.groupby("supplier")

        # Global stats for normalization
        global_avg_delay = df["delay_days"].mean() if "delay_days" in df.columns else 0
        global_max_delay = df["delay_days"].max() if "delay_days" in df.columns else 1
        global_avg_cost = df["cost"].mean() if "cost" in df.columns else 0

        for supplier, group in grouped:
            factors = {}

            # Delay frequency: % of shipments with delay > 0
            if "delay_days" in group.columns:
                delays = pd.to_numeric(group["delay_days"], errors="coerce").fillna(0)
                factors["delay_frequency"] = min(100.0, (delays > 0).mean() * 100)
                factors["delay_severity"] = min(100.0, (delays.mean() / max(global_max_delay, 1)) * 100)
                factors["consistency"] = min(100.0, delays.std() / max(delays.mean(), 0.01) * 30)
            else:
                factors["delay_frequency"] = 0
                factors["delay_severity"] = 0
                factors["consistency"] = 0

            # Cost variance
            if "cost" in group.columns:
                costs = pd.to_numeric(group["cost"], errors="coerce").fillna(0)
                cost_cv = costs.std() / max(costs.mean(), 0.01)
                factors["cost_variance"] = min(100.0, cost_cv * 40)
            else:
                factors["cost_variance"] = 0

            # Quality factor (inverted — low quality = high risk)
            if "quality_score" in group.columns and group["quality_score"].notna().sum() > 0:
                avg_quality = group["quality_score"].mean()
                factors["quality_factor"] = max(0, 100 - avg_quality)
            else:
                factors["quality_factor"] = 30  # neutral if no data

            # Volume reliability
            factors["volume_reliability"] = max(0, 50 - len(group)) if len(group) < 50 else 0

            # Weighted composite score
            risk_score = sum(
                factors.get(k, 0) * w for k, w in self.WEIGHTS.items()
            )
            risk_score = round(min(100.0, max(0.0, float(risk_score))), 1)  # type: ignore

            # Determine tier
            if risk_score >= 70:
                tier = "critical"
            elif risk_score >= 40:
                tier = "elevated"
            else:
                tier = "stable"

            delays_col = pd.to_numeric(group.get("delay_days", pd.Series([0])), errors="coerce").fillna(0)
            costs_col = pd.to_numeric(group.get("cost", pd.Series([0])), errors="coerce").fillna(0)

            results.append({
                "supplier": str(supplier),
                "risk_score": risk_score,
                "tier": tier,
                "total_shipments": len(group),
                "avg_delay": round(float(delays_col.mean()), 1),  # type: ignore
                "max_delay": int(delays_col.max()),
                "total_cost": round(float(costs_col.sum()), 2),  # type: ignore
                "reliability_score": round(100.0 - risk_score, 1),  # type: ignore
                "factors": factors,
            })

        results.sort(key=lambda x: x["risk_score"], reverse=True)
        return results


class TimeSeriesForecaster:
    """Time-series analysis and simple forecasting."""

    def analyze_trends(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze time-based trends in supply chain data."""
        result: Dict[str, Any] = {
            "delay_trend": [],
            "cost_trend": [],
            "volume_trend": [],
            "forecast": {},
            "seasonality": {},
        }

        # Try to parse dates
        date_col = None
        for col in ["order_date", "delivery_date", "date", "created_at"]:
            if col in df.columns:
                date_col = col
                break

        if date_col:
            df_copy = df.copy()
            df_copy["_date"] = pd.to_datetime(df_copy[date_col], errors="coerce")
            df_copy = df_copy.dropna(subset=["_date"])

            if len(df_copy) > 0:
                df_copy = df_copy.sort_values("_date")
                df_copy["_period"] = df_copy["_date"].dt.to_period("M").astype(str)

                # Monthly delay trend
                if "delay_days" in df_copy.columns:
                    delay_trend = df_copy.groupby("_period")["delay_days"].mean()
                    result["delay_trend"] = [
                        {"period": str(p), "avg_delay": round(float(v), 1)}  # type: ignore
                        for p, v in delay_trend.items()
                    ]

                # Monthly cost trend
                if "cost" in df_copy.columns:
                    cost_trend = df_copy.groupby("_period")["cost"].sum()
                    result["cost_trend"] = [
                       {"period": str(p), "total_cost": round(float(v), 2)}  # type: ignore
                        for p, v in cost_trend.items()
                    ]

                # Volume trend
                vol_trend = df_copy.groupby("_period").size()
                result["volume_trend"] = [
                    {"period": str(p), "count": int(v)}
                    for p, v in vol_trend.items()
                ]

                if "delay_days" in df_copy.columns and len(result["delay_trend"]) >= 6:
                    values_list = [float(d["avg_delay"]) for d in result["delay_trend"]]
                    # Use Holt-Winters if we have enough data, else fallback to SES
                    forecast = self._holt_winters_forecast(values_list, periods=3)
                    last_period = result["delay_trend"][-1]["period"]
                    result["forecast"]["delay"] = {
                        "next_periods": forecast,
                        "trend_direction": "increasing" if forecast[-1]["predicted_value"] > values_list[-1] else "decreasing",
                        "confidence": "high" if len(values_list) >= 12 else "medium",
                        "method": "holt_winters"
                    }
                elif "delay_days" in df_copy.columns and len(result["delay_trend"]) >= 3:
                    values_list = [float(d["avg_delay"]) for d in result["delay_trend"]]
                    forecast = self._exp_smoothing_forecast(values_list, periods=3)
                    result["forecast"]["delay"] = {
                        "next_periods": forecast,
                        "trend_direction": "increasing" if forecast[-1]["predicted_value"] > values_list[-1] else "decreasing",
                        "confidence": "low",
                        "method": "simple_exponential_smoothing"
                    }

        # If no date column, analyze by index chunks
        if not date_col and len(df) > 50:
            chunk_size = len(df) // 10
            if "delay_days" in df.columns:
                delays = pd.to_numeric(df["delay_days"], errors="coerce").fillna(0)
                for i in range(10):
                    chunk = delays.iloc[i*chunk_size:(i+1)*chunk_size]
                    result["delay_trend"].append({
                        "period": f"Batch {i+1}",
                        "avg_delay": round(float(chunk.mean()), 1),  # type: ignore
                    })

        return result

    def _exp_smoothing_forecast(self, values: List[float], periods: int = 3, alpha: float = 0.3) -> List[Dict[str, Any]]:
        """Simple exponential smoothing forecast."""
        if not values:
            return []

        smoothed = float(values[0])
        for v in values[1:]:  # type: ignore
            smoothed = alpha * v + (1.0 - alpha) * smoothed

        forecasts = []
        for i in range(periods):
            # Add slight trend continuation
            trend = (float(values[-1]) - float(values[0])) / max(len(values), 1)
            predicted = round(smoothed + trend * (i + 1), 1)  # type: ignore
            forecasts.append({
                "period_ahead": i + 1,
                "predicted_value": max(0.0, float(predicted)),
            })
        return forecasts

    def _holt_winters_forecast(self, values: List[float], periods: int = 3, seasonal_periods: int = 4) -> List[Dict[str, Any]]:
        """Holt-Winters Triple Exponential Smoothing (Additive)."""
        if len(values) < seasonal_periods * 2:
            return self._exp_smoothing_forecast(values, periods)

        alpha, beta, gamma = 0.3, 0.1, 0.2
        
        # Initial level, trend, and seasonality
        level = values[0]
        trend = np.mean([values[i] - values[i-1] for i in range(1, seasonal_periods)])
        seasonals = [values[i] - level for i in range(seasonal_periods)]
        
        for i in range(len(values)):
            val = values[i]
            last_level = level
            level = alpha * (val - seasonals[i % seasonal_periods]) + (1 - alpha) * (level + trend)
            trend = beta * (level - last_level) + (1 - beta) * trend
            seasonals[i % seasonal_periods] = gamma * (val - level) + (1 - gamma) * seasonals[i % seasonal_periods]
            
        forecasts = []
        for i in range(1, periods + 1):
            m = i % seasonal_periods
            predicted = level + i * trend + seasonals[(len(values) + i - 1) % seasonal_periods]
            forecasts.append({
                "period_ahead": i,
                "predicted_value": round(float(max(0.0, predicted)), 1)
            })
        return forecasts


class SupplyChainAnalyzer:
    """Master orchestrator for all ML analyses."""

    def __init__(self):
        self.anomaly_detector = AnomalyDetector()
        self.risk_scorer = RiskScorer()
        self.forecaster = TimeSeriesForecaster()

    def full_analysis(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Run complete ML pipeline on supply chain data.

        Each sub-step is wrapped so a partial failure does not lose the
        results of the other steps.
        """
        result: Dict[str, Any] = {"generated_at": datetime.utcnow().isoformat()}

        for key, fn in [
            ("summary", lambda: self._compute_summary(df)),
            ("risk_scores", lambda: self.risk_scorer.score_suppliers(df)),
            ("anomalies", lambda: self.anomaly_detector.detect(df)),
            ("time_series", lambda: self.forecaster.analyze_trends(df)),
            ("bullwhip_analysis", lambda: self._detect_bullwhip(df)),
            ("data_quality", lambda: self._assess_quality(df)),
        ]:
            try:
                result[key] = fn()
            except Exception as exc:
                print(f"[ML Engine] {key} step failed: {exc}")
                result[key] = {}  # safe fallback

        return result

    def _compute_summary(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Enhanced analytics summary."""
        summary: Dict[str, Any] = {
            "total_records": len(df),
            "unique_suppliers": df["supplier"].nunique() if "supplier" in df.columns else 0,
            "unique_skus": df["sku"].nunique() if "sku" in df.columns else 0,
            "unique_regions": df["region"].nunique() if "region" in df.columns else 0,
            "unique_warehouses": df["warehouse"].nunique() if "warehouse" in df.columns else 0,
        }

        if "delay_days" in df.columns:
            delays = pd.to_numeric(df["delay_days"], errors="coerce").fillna(0)
            summary["avg_delay_days"] = round(float(delays.mean()), 1)  # type: ignore
            summary["max_delay_days"] = int(delays.max())
            summary["median_delay"] = round(float(delays.median()), 1)  # type: ignore
            summary["delayed_shipments_pct"] = round(float((delays > 0).mean() * 100.0), 1)  # type: ignore

        if "cost" in df.columns:
            costs = pd.to_numeric(df["cost"], errors="coerce").fillna(0)
            summary["total_cost"] = round(float(costs.sum()), 2)  # type: ignore
            summary["avg_cost"] = round(float(costs.mean()), 2)  # type: ignore

        if "quality_score" in df.columns and df["quality_score"].notna().sum() > 0:
            summary["avg_quality"] = round(float(df["quality_score"].mean()), 1)  # type: ignore

        return summary

    def _detect_bullwhip(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Detect Bullwhip Effect by comparing order variance with consumer demand variance."""
        if "cost" not in df.columns or len(df) < 10:
            return {"bullwhip_ratio": 1.0, "status": "insufficient_data"}
            
        # We group by month to get demand variance
        date_col = next((c for c in ["order_date", "date"] if c in df.columns), None)
        if not date_col:
            # Fallback to index-based chunks
            chunk_size = max(1, len(df) // 5)
            shipments = [len(df.iloc[i:i+chunk_size]) for i in range(0, len(df), chunk_size)]
        else:
            try:
                df_copy = df.copy()
                df_copy["_dt"] = pd.to_datetime(df_copy[date_col], errors="coerce")
                shipments = df_copy.dropna(subset=["_dt"]).resample("W", on="_dt").size().tolist()
            except:
                shipments = []
            
        if len(shipments) < 4:
            return {"bullwhip_ratio": 1.0, "status": "insufficient_time_series"}
            
        # Bullwhip Ratio = Var(Orders) / Var(Demand)
        # Simplified: We treat the variance in shipments as a proxy
        var_orders = float(np.var(shipments))
        mean_orders = float(np.mean(shipments))
        
        # Market standard threshold: Ratio > 1.5 indicates significant bullwhip
        cv = (float(np.sqrt(var_orders)) / mean_orders) if mean_orders > 0 else 0.0
        bullwhip_ratio = round(float(1.0 + cv * 2), 2)
        
        return {
            "bullwhip_ratio": bullwhip_ratio,
            "coefficient_of_variation": round(float(cv), 3),
            "status": "high" if bullwhip_ratio > 1.5 else "elevated" if bullwhip_ratio > 1.2 else "stable",
            "interpretation": "High demand-supply mismatch detected" if bullwhip_ratio > 1.5 else "Supply chain is relatively synchronized",
            "variance_indices": shipments
        }

    def _assess_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Data quality assessment."""
        total_cells = df.shape[0] * df.shape[1]
        missing_cells = int(df.isnull().sum().sum())

        column_quality = {}
        for col in df.columns:
            missing = int(df[col].isnull().sum())
            column_quality[col] = {
                "missing_count": missing,
                "missing_pct": round(float(missing / len(df) * 100.0), 1) if len(df) > 0 else 0.0,  # type: ignore
                "dtype": str(df[col].dtype),
                "unique_values": int(df[col].nunique()),
            }

        return {
            "total_cells": total_cells,
            "missing_cells": missing_cells,
            "completeness_pct": round(float((1.0 - missing_cells / max(total_cells, 1)) * 100.0), 1),  # type: ignore
            "columns": column_quality,
            "row_count": len(df),
            "column_count": len(df.columns),
        }