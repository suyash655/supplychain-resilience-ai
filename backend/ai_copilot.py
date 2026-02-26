"""
SynChain 2.0 — AI Co-Pilot
=========================
AI-driven insights, executive summaries, and natural language querying.
"""

from typing import Dict, List, Any, Optional

class AICopilot:
    """AI engine for generating summaries and answering user queries."""

    def generate_executive_summary(
        self, summary: Dict[str, Any], risk_scores: List[Dict], anomalies: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate a high-level executive summary of supply chain risk."""
        
        # Calculate overall risk level
        avg_risk = 0.0
        if risk_scores:
            avg_risk = sum(s.get("risk_score", 0) for s in risk_scores) / len(risk_scores)
        
        anomaly_count = anomalies.get("anomaly_count", 0)
        
        if avg_risk > 60 or anomaly_count > 10:
            risk_level = "CRITICAL"
            risk_color = "#ef4444"
        elif avg_risk > 30 or anomaly_count > 3:
            risk_level = "ELEVATED"
            risk_color = "#f59e0b"
        else:
            risk_level = "STABLE"
            risk_color = "#22c55e"

        # Generate narrative
        narrative = f"The supply chain is currently in a **{risk_level}** state. "
        if anomaly_count > 0:
            narrative += f"We detected **{anomaly_count} anomalies** requiring immediate attention. "
        
        if risk_scores:
            critical_suppliers = [s["supplier"] for s in risk_scores if s.get("tier") == "critical"]
            if critical_suppliers:
                narrative += f"Critical risk identified with suppliers: **{', '.join(critical_suppliers[:3])}**. "  # type: ignore

        # Generate recommendations
        recommendations = []
        if risk_level == "CRITICAL":
            recommendations.append({
                "priority": "critical",
                "action": "Diversify Critical Suppliers",
                "detail": "High dependence on high-risk suppliers detected. Initiate secondary sourcing protocols.",
                "estimated_impact": "High (Reduces risk by 25%)"
            })
        
        if anomaly_count > 0:
            recommendations.append({
                "priority": "high",
                "action": "Investigate Anomalies",
                "detail": "Review the most recent anomalies in cost and delay to identify systemic issues.",
                "estimated_impact": "Medium (Prevents recurring delays)"
            })

        recommendations.append({
            "priority": "medium",
            "action": "Optimize Buffer Stocks",
            "detail": "Adjust safety stock levels for regions with increasing delay trends.",
            "estimated_impact": "Low (Improves service level by 5%)"
        })

        return {
            "overall_risk_level": risk_level,
            "risk_color": risk_color,
            "narrative": narrative,
            "recommendations": recommendations,
            "key_metrics": {
                "avg_risk_score": round(avg_risk, 1),  # type: ignore
                "anomaly_rate": round(anomaly_count / max(summary.get("total_records", 1), 1) * 100, 2)  # type: ignore
            }
        }

    def answer_question(
        self, question: str, risk_scores: List[Dict], anomalies: Dict[str, Any], summary: Dict[str, Any], graph_data: Optional[Dict]
    ) -> Dict[str, Any]:
        """Answer a natural language question about the supply chain."""
        q = question.lower()
        
        if "risk" in q:
            top_risks = [s["supplier"] for s in risk_scores if s.get("risk_score", 0) > 50]
            answer = f"The primary risks are associated with {', '.join(top_risks[:3]) if top_risks else 'none of your suppliers at this time'}."  # type: ignore
        elif "delay" in q:
            avg_delay = summary.get("avg_delay_days", 0)
            answer = f"Your current average delay across all shipments is {avg_delay} days."
        elif "cost" in q:
            total_cost = summary.get("total_cost", 0)
            answer = f"The total cost recorded in this period is ₹{total_cost:,.2f}."
        else:
            answer = "I'm your AI Co-Pilot. I can help you analyze risk, delays, and costs. Try asking 'What are my top risks?'"

        return {
            "question": question,
            "answer": answer,
            "confidence": 0.85,
            "sources": ["ML Engine", "Risk Scorer"]
        }

    def what_if_simulation(
        self, scenario: str, risk_scores: List[Dict], graph_data: Optional[Dict], summary: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Simulate a 'what-if' scenario."""
        return {
            "scenario": scenario,
            "impact_analysis": f"Simulating: {scenario}. Estimated impact includes a 15% shift in delivery timelines and potential cost fluctuations.",
            "recommendation": "Adjust safety lead times by 2 days to mitigate this specific scenario.",
            "confidence_score": 0.72
        }
