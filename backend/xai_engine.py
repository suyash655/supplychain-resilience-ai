"""
SynChain 2.0 — Explainable AI Engine
======================================
Feature importance, counterfactual explanations, and causal reasoning.
"""

import pandas as pd  # type: ignore
import numpy as np  # type: ignore
from typing import Dict, List, Any
from sklearn.ensemble import RandomForestRegressor  # type: ignore
from sklearn.inspection import permutation_importance  # type: ignore


class XAIEngine:
    """Explainable AI module for supply chain risk transparency."""

    def compute_feature_importance(self, df: pd.DataFrame, target_col: str = "delay_days") -> Dict[str, Any]:
        """Compute feature importance for predicting the target variable."""
        if target_col not in df.columns:
            return {"error": f"Target column '{target_col}' not found"}

        # Prepare features
        numeric_cols = [c for c in df.select_dtypes(include=[np.number]).columns if c != target_col and c != "id"]
        categorical_cols = [c for c in ["supplier", "sku", "warehouse", "region", "category"] if c in df.columns]

        if len(numeric_cols) == 0 and len(categorical_cols) == 0:
            return {"error": "Insufficient features for importance analysis"}

        # Encode categoricals
        df_encoded = df.copy()
        for col in categorical_cols:
            if col in df_encoded.columns:
                df_encoded[col + "_encoded"] = df_encoded[col].astype("category").cat.codes
                numeric_cols.append(col + "_encoded")  # type: ignore[arg-type]

        feature_cols = numeric_cols
        X = df_encoded[feature_cols].fillna(0).values
        y = pd.to_numeric(df_encoded[target_col], errors="coerce").fillna(0).values

        if len(X) < 10:
            return {"error": "Insufficient data for importance analysis (need at least 10 rows)"}

        # Train a simple model to get feature importance
        model = RandomForestRegressor(n_estimators=50, random_state=42, max_depth=10)
        model.fit(X, y)

        # Built-in importance
        importances = model.feature_importances_

        # Also do permutation importance
        try:
            perm = permutation_importance(model, X, y, n_repeats=5, random_state=42)
            perm_importances = perm.importances_mean
        except:
            perm_importances = importances

        # Format results
        feature_results = []
        for i, col in enumerate(feature_cols):
            display_name = col.replace("_encoded", "")
            feature_results.append({
                "feature": display_name,
                "importance": round(float(importances[i]), 4),  # type: ignore[call-overload]
                "permutation_importance": round(float(perm_importances[i]), 4),  # type: ignore[call-overload]
                "rank": 0,  # Will be set below
            })

        feature_results.sort(key=lambda x: x["importance"], reverse=True)
        for i, f in enumerate(feature_results):
            f["rank"] = i + 1

        return {
            "target": target_col,
            "model_score": round(float(model.score(X, y)), 3),  # type: ignore[call-overload]
            "features": feature_results,
            "top_driver": feature_results[0]["feature"] if feature_results else None,
            "interpretation": self._interpret_importance(feature_results, target_col),
        }

    def generate_counterfactuals(self, df: pd.DataFrame, risk_scores: List[Dict], graph_engine: Any = None) -> List[Dict]:
        """Generate counterfactual explanations and route optimization suggestions."""
        counterfactuals = []

        for supplier_data in list(risk_scores)[:10]:  # type: ignore[index]
            supplier = supplier_data["supplier"]
            risk_score = supplier_data["risk_score"]

            if risk_score < 30:
                continue  # Skip low-risk suppliers

            factors = supplier_data.get("factors", {})
            cf_suggestions = []

            # 1. Operational Counterfactuals
            if factors.get("delay_frequency", 0) > 30:
                reduction = factors["delay_frequency"] * 0.3
                new_risk = max(0, risk_score - reduction * 0.3)
                cf_suggestions.append({
                    "type": "operational",
                    "change": f"Reduce delay frequency by 30%",
                    "current_value": round(float(factors["delay_frequency"]), 1),
                    "target_value": round(float(factors["delay_frequency"] * 0.7), 1),
                    "risk_reduction": round(float(risk_score - new_risk), 1),
                    "new_risk_score": round(float(new_risk), 1),
                })

            if factors.get("delay_severity", 0) > 20:
                reduction = factors["delay_severity"] * 0.5
                new_risk = max(0, risk_score - reduction * 0.2)
                cf_suggestions.append({
                    "type": "operational",
                    "change": f"Reduce average delivery time by 2 days",
                    "current_value": round(float(supplier_data.get("avg_delay", 0)), 1),
                    "target_value": round(float(max(0, supplier_data.get("avg_delay", 0) - 2)), 1),
                    "risk_reduction": round(float(risk_score - new_risk), 1),
                    "new_risk_score": round(float(new_risk), 1),
                })

            # 2. Route Optimization Suggestions (Alternative Suppliers)
            if graph_engine and risk_score > 50:
                alternatives = self.suggest_alternate_routes(df, supplier, risk_scores)
                for alt in alternatives[:2]:
                    cf_suggestions.append({
                        "type": "strategic",
                        "change": f"Diversify load to {alt['supplier']}",
                        "current_value": supplier,
                        "target_value": alt["supplier"],
                        "risk_reduction": round(float(risk_score - alt["risk_score"]), 1),
                        "new_risk_score": round(float(alt["risk_score"]), 1),
                        "detail": f"Switching to {alt['supplier']} could reduce node risk by {round(float(risk_score - alt['risk_score']), 1)} points."
                    })

            if cf_suggestions:
                counterfactuals.append({
                    "supplier": supplier,
                    "current_risk_score": risk_score,
                    "tier": supplier_data.get("tier", "unknown"),
                    "counterfactuals": cf_suggestions,
                    "best_action": max(cf_suggestions, key=lambda x: x["risk_reduction"])["change"],
                })

        return counterfactuals

    def suggest_alternate_routes(self, df: pd.DataFrame, current_supplier: str, all_risk_scores: List[Dict]) -> List[Dict]:
        """Find alternative suppliers for the same SKUs with lower risk scores."""
        if current_supplier not in df["supplier"].values:
            return []
            
        # 1. Identify SKUs supplied by current supplier
        supplier_skus = set(df[df["supplier"] == current_supplier]["sku"].unique())
        
        # 2. Find other suppliers for the same SKUs
        alt_suppliers_df = df[df["sku"].isin(supplier_skus) & (df["supplier"] != current_supplier)]
        potential_alts = set(alt_suppliers_df["supplier"].unique())
        
        # 3. Filter by risk score
        risk_map = {s["supplier"]: s["risk_score"] for s in all_risk_scores}
        current_risk = risk_map.get(current_supplier, 100)
        
        results = []
        for alt in potential_alts:
            alt_risk = risk_map.get(alt, 100)
            if alt_risk < current_risk:
                results.append({
                    "supplier": alt,
                    "risk_score": alt_risk,
                })
                
        return sorted(results, key=lambda x: x["risk_score"])

    def _interpret_importance(self, features: List[Dict], target: str) -> str:
        """Generate human-readable interpretation."""
        if not features:
            return "Insufficient data for interpretation."

        top = features[0]
        interpretation = (
            f"The most influential factor for predicting **{target}** is "
            f"**{top['feature']}** (importance: {top['importance']:.3f}). "
        )

        if len(features) > 1:
            second = features[1]
            interpretation += (
                f"The second most important factor is **{second['feature']}** "
                f"(importance: {second['importance']:.3f}). "
            )

        if len(features) > 2:
            remaining = ", ".join(f["feature"] for f in list(features)[2:5])  # type: ignore[index]
            interpretation += f"Other contributing factors include: {remaining}."

        return interpretation
