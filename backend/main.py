
"""
SynChain 2.0 — Main API Server
================================
Enterprise-grade supply chain intelligence API.
"""

import math
import json
import io
import traceback
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, Query, HTTPException  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from fastapi.responses import StreamingResponse, JSONResponse  # type: ignore
from sqlalchemy import func  # type: ignore
import pandas as pd  # type: ignore
import numpy as np  # type: ignore

from database import engine, SessionLocal  # type: ignore
from models import Base, SupplyData, SupplierProfile, RiskEvent, AnalysisResult, UploadHistory  # type: ignore
from ml_engine import SupplyChainAnalyzer  # type: ignore
from graph_engine import SupplyChainGraph  # type: ignore
from ai_copilot import AICopilot  # type: ignore
from xai_engine import XAIEngine  # type: ignore

# ---- openpyxl check (xlsx uploads need it) ----
try:
    import openpyxl  # type: ignore  # noqa: F401
except ImportError:
    print(
        "[SynChain] WARNING: openpyxl not installed — Excel (.xlsx) upload will fail.\n"
        "           Install with: pip install openpyxl"
    )


# ---- Safe JSON response (NaN / Inf → null) ----
class SafeJSONResponse(JSONResponse):
    """JSONResponse that silently converts NaN/Inf to null."""

    def render(self, content) -> bytes:
        return json.dumps(
            content,
            ensure_ascii=False,
            allow_nan=False,
            default=self._default_serializer,
        ).encode("utf-8")

    @staticmethod
    def _default_serializer(obj):
        if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            return None
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            v = float(obj)
            return None if (math.isnan(v) or math.isinf(v)) else v
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return str(obj)


# ---- Initialize FastAPI ----
app = FastAPI(
    title="SynChain 2.0 API",
    description="Enterprise AI-Powered Supply Chain Intelligence",
    version="2.0.0",
    default_response_class=SafeJSONResponse,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# Engine singletons
ml_analyzer = SupplyChainAnalyzer()
graph_engine = SupplyChainGraph()
ai_copilot = AICopilot()
xai_engine = XAIEngine()

# Cache for latest analysis results
_analysis_cache: Dict[str, Any] = {}


@app.get("/")
async def root():
    """Welcome message and API status."""
    return {
        "status": "online",
        "message": "SynChain 2.0 API is running",
        "docs": "/docs",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/system/health")
async def health_check():
    """Detailed health status for monitoring."""
    return {
        "status": "healthy",
        "engines": {
            "ml": "active",
            "graph": "active",
            "ai_copilot": "active",
            "xai": "active"
        },
        "database": "connected"
    }


def _load_dataframe() -> pd.DataFrame:
    """Load all supply data into a DataFrame."""
    db = SessionLocal()
    try:
        rows = db.query(SupplyData).all()
        if not rows:
            return pd.DataFrame()
        data = []
        for r in rows:
            data.append({
                "id": r.id,
                "supplier": r.supplier,
                "sku": r.sku,
                "warehouse": r.warehouse,
                "region": r.region,
                "shipment_id": r.shipment_id,
                "order_date": r.order_date,
                "delivery_date": r.delivery_date,
                "delay_days": r.delay_days,
                "cost": r.cost,
                "quantity": r.quantity,
                "category": r.category,
                "quality_score": r.quality_score,
            })
        return pd.DataFrame(data)
    except Exception as e:
        print(f"Error loading data: {e}")
        return pd.DataFrame()
    finally:
        db.close()


def _run_full_analysis():
    """Run and cache the full ML analysis pipeline.

    Each stage is independent so a failure in one (e.g. XAI)
    does not discard results from the others.
    """
    global _analysis_cache
    df = _load_dataframe()
    if df.empty:
        _analysis_cache = {}
        return

    # --- ML Analysis ---
    try:
        _analysis_cache["ml"] = ml_analyzer.full_analysis(df)
        _analysis_cache["df"] = df
    except Exception as e:
        print(f"[SynChain] ML analysis failed: {e}")
        traceback.print_exc()

    # --- Graph Analysis ---
    try:
        _analysis_cache["graph_summary"] = graph_engine.build_from_data(df)
        _analysis_cache["centrality"] = graph_engine.get_centrality_scores()
        _analysis_cache["critical_paths"] = graph_engine.find_critical_paths()
        _analysis_cache["graph_vis"] = graph_engine.get_nodes_and_edges()
    except Exception as e:
        print(f"[SynChain] Graph analysis failed: {e}")
        traceback.print_exc()

    # --- XAI ---
    try:
        risk_scores = _analysis_cache.get("ml", {}).get("risk_scores", [])
        _analysis_cache["xai_importance"] = xai_engine.compute_feature_importance(df)
        # Pass graph_engine for route optimization suggestions
        _analysis_cache["xai_counterfactuals"] = xai_engine.generate_counterfactuals(df, risk_scores, graph_engine)
    except Exception as e:
        print(f"[SynChain] XAI analysis failed: {e}")
        traceback.print_exc()

    # --- AI Executive Summary ---
    try:
        risk_scores = _analysis_cache.get("ml", {}).get("risk_scores", [])
        summary = _analysis_cache.get("ml", {}).get("summary", {})
        anomalies = _analysis_cache.get("ml", {}).get("anomalies", {})
        _analysis_cache["executive_summary"] = ai_copilot.generate_executive_summary(
            summary, risk_scores, anomalies
        )
    except Exception as e:
        print(f"[SynChain] Executive summary failed: {e}")
        traceback.print_exc()

    _analysis_cache["last_updated"] = datetime.utcnow().isoformat()
    print(f"[SynChain] Full analysis completed at {_analysis_cache['last_updated']}")


# ============================================================
# UPLOAD ENDPOINTS
# ============================================================

COLUMN_SYNONYMS = {
    "supplier": ["supplier", "vendor", "supplier_name", "vendor_name", "manufacturer", "source"],
    "sku": ["sku", "product", "item", "product_id", "item_id", "part_number", "product_code"],
    "delay_days": ["delay_days", "delay", "days_late", "lead_time_variance", "late_days", "shipment_delay"],
    "cost": ["cost", "price", "amount", "value", "total_cost", "unit_price", "total_amount"],
    "warehouse": ["warehouse", "warehouse_name", "distribution_center", "dc", "facility", "storage"],
    "region": ["region", "location", "area", "zone", "territory", "country", "city"],
    "shipment_id": ["shipment_id", "shipment", "order_id", "order_number", "tracking", "po_number"],
    "order_date": ["order_date", "order_dt", "purchase_date", "created_date", "date"],
    "delivery_date": ["delivery_date", "delivery_dt", "received_date", "arrival_date", "ship_date"],
    "quantity": ["quantity", "qty", "units", "volume", "count", "pieces"],
    "category": ["category", "product_category", "type", "segment", "classification", "group"],
    "quality_score": ["quality_score", "quality", "rating", "grade", "score", "performance"],
}


def _auto_detect_columns(columns: List[str]) -> Dict[str, str]:
    """Auto-detect column mapping using fuzzy matching."""
    detected: Dict[str, str] = {}
    normalized: Dict[str, str] = {c.lower().strip(): c for c in columns}

    for target_col, synonyms in COLUMN_SYNONYMS.items():
        for synonym in synonyms:
            if synonym in normalized:
                detected[target_col] = normalized[synonym]  # type: ignore
                break

    return detected


def _safe_str(val) -> Optional[str]:
    """Safely convert a value to string, returning None for NaN/None."""
    if val is None:
        return None
    if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
        return None
    s = str(val).strip()
    if s.lower() in ("nan", "none", "nat", ""):
        return None
    return s


def _safe_int(val, default=0) -> int:
    """Safely convert to int."""
    try:
        if val is None:
            return default
        if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
            return default
        return int(float(val))
    except (ValueError, TypeError):
        return default


def _safe_float(val, default=0.0) -> float:
    """Safely convert to float."""
    try:
        if val is None:
            return default
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return default
        return f
    except (ValueError, TypeError):
        return default


@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    mapping: str = Form(None),
):
    """Upload CSV or Excel file with auto column detection."""
    filename = file.filename or "upload"
    file_ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    # Read file
    contents = await file.read()
    try:
        if file_ext in ("xlsx", "xls"):
            df = pd.read_excel(io.BytesIO(contents), engine="openpyxl")
            file_type = "xlsx"
        else:
            df = pd.read_csv(io.BytesIO(contents))
            file_type = "csv"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="File is empty")

    # Column mapping
    if mapping:
        try:
            mapping_dict = json.loads(mapping)
        except json.JSONDecodeError:
            mapping_dict = _auto_detect_columns(df.columns.tolist())
    else:
        mapping_dict = _auto_detect_columns(df.columns.tolist())

    # Data quality report
    quality_report = {
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "detected_columns": list(df.columns),
        "mapped_columns": mapping_dict,
        "missing_values": {
            col: int(df[col].isnull().sum()) for col in df.columns
        },
        "column_types": {col: str(df[col].dtype) for col in df.columns},
    }

    # Insert into database
    db = SessionLocal()
    inserted = 0
    rejected = 0

    for _, row in df.iterrows():
        try:
            # Get values using the mapping
            supplier_col = mapping_dict.get("supplier", "supplier")  # type: ignore[union-attr]
            sku_col = mapping_dict.get("sku", "sku")  # type: ignore[union-attr]
            warehouse_col = mapping_dict.get("warehouse", "warehouse")  # type: ignore[union-attr]
            region_col = mapping_dict.get("region", "region")  # type: ignore[union-attr]
            shipment_id_col = mapping_dict.get("shipment_id", "shipment_id")  # type: ignore[union-attr]
            order_date_col = mapping_dict.get("order_date", "order_date")  # type: ignore[union-attr]
            delivery_date_col = mapping_dict.get("delivery_date", "delivery_date")  # type: ignore[union-attr]
            delay_days_col = mapping_dict.get("delay_days", "delay_days")  # type: ignore[union-attr]
            cost_col = mapping_dict.get("cost", "cost")  # type: ignore[union-attr]
            quantity_col = mapping_dict.get("quantity", "quantity")  # type: ignore[union-attr]
            category_col = mapping_dict.get("category", "category")  # type: ignore[union-attr]
            quality_score_col = mapping_dict.get("quality_score", "quality_score")  # type: ignore[union-attr]

            record = SupplyData(
                supplier=_safe_str(row.get(supplier_col)) or "Unknown",
                sku=_safe_str(row.get(sku_col)) or "Unknown",
                warehouse=_safe_str(row.get(warehouse_col)),
                region=_safe_str(row.get(region_col)),
                shipment_id=_safe_str(row.get(shipment_id_col)),
                order_date=_safe_str(row.get(order_date_col)),
                delivery_date=_safe_str(row.get(delivery_date_col)),
                delay_days=_safe_int(row.get(delay_days_col)),
                cost=_safe_float(row.get(cost_col)),
                quantity=_safe_int(row.get(quantity_col)),
                category=_safe_str(row.get(category_col)),
                quality_score=_safe_float(row.get(quality_score_col)) if row.get(quality_score_col) is not None else None,
            )
            db.add(record)
            inserted += 1  # type: ignore[operator]
        except Exception as e:
            rejected += 1  # type: ignore[operator]
            print(f"Row rejected: {e}")

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database commit failed: {str(e)}")

    # Save upload history
    try:
        history = UploadHistory(
            filename=filename,
            file_type=file_type,
            rows_total=len(df),
            rows_inserted=inserted,
            rows_rejected=rejected,
            columns_detected=list(df.columns),
            column_mapping=mapping_dict,
            data_quality_report=quality_report,
        )
        db.add(history)
        db.commit()
    except Exception as e:
        print(f"Warning: Could not save upload history: {e}")
        db.rollback()

    db.close()

    # Trigger analysis
    try:
        _run_full_analysis()
    except Exception as e:
        print(f"Warning: Analysis failed but upload succeeded: {e}")

    return {
        "status": "success",
        "rows_inserted": inserted,
        "rows_rejected": rejected,
        "column_mapping": mapping_dict,
        "data_quality": quality_report,
    }


@app.post("/upload/preview")
async def preview_upload(file: UploadFile = File(...)):
    """Preview file contents and auto-detected columns without importing."""
    filename = file.filename or "upload"
    file_ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    contents = await file.read()
    try:
        if file_ext in ("xlsx", "xls"):
            df = pd.read_excel(io.BytesIO(contents), engine="openpyxl", nrows=20)
        else:
            df = pd.read_csv(io.BytesIO(contents), nrows=20)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    mapping = _auto_detect_columns(df.columns.tolist())  # type: ignore[arg-type]

    return {
        "filename": filename,
        "file_type": file_ext,
        "columns": list(df.columns),
        "auto_mapping": mapping,
        "preview_rows": df.head(10).fillna("").to_dict(orient="records"),
        "total_preview_rows": len(df),
    }


@app.get("/upload/columns")
def get_last_upload_columns():
    """Return columns from the most recent upload (used by column-mapping UI)."""
    db = SessionLocal()
    try:
        latest = db.query(UploadHistory).order_by(UploadHistory.id.desc()).first()
        if not latest or not latest.columns_detected:
            return {"columns": [], "mapping": {}}
        return {
            "columns": latest.columns_detected,
            "mapping": latest.column_mapping or {},
        }
    finally:
        db.close()


@app.post("/upload/confirm")
def confirm_upload(body: dict):
    """Accept user-confirmed column mapping and re-trigger analysis."""
    _run_full_analysis()
    return {"status": "success", "message": "Analysis triggered with confirmed mapping"}


# ============================================================
# ANALYTICS ENDPOINTS
# ============================================================

@app.get("/analytics/summary")
def analytics_summary():
    """Enhanced analytics summary."""
    if "ml" in _analysis_cache:
        return _analysis_cache["ml"]["summary"]

    db = SessionLocal()
    try:
        total_rows = db.query(func.count(SupplyData.id)).scalar() or 0
        avg_delay = db.query(func.avg(SupplyData.delay_days)).scalar()
        max_delay = db.query(func.max(SupplyData.delay_days)).scalar()
        total_cost = db.query(func.sum(SupplyData.cost)).scalar()
        unique_suppliers = db.query(func.count(func.distinct(SupplyData.supplier))).scalar() or 0
        unique_skus = db.query(func.count(func.distinct(SupplyData.sku))).scalar() or 0
        unique_regions = db.query(func.count(func.distinct(SupplyData.region))).scalar() or 0
        unique_warehouses = db.query(func.count(func.distinct(SupplyData.warehouse))).scalar() or 0
    finally:
        db.close()

    return {
        "total_records": int(total_rows),
        "avg_delay_days": round(float(avg_delay), 1) if avg_delay else 0,  # type: ignore[call-overload]
        "max_delay_days": int(max_delay) if max_delay else 0,
        "total_cost": round(float(total_cost), 2) if total_cost else 0,  # type: ignore[call-overload]
        "unique_suppliers": int(unique_suppliers),
        "unique_skus": int(unique_skus),
        "unique_regions": int(unique_regions),
        "unique_warehouses": int(unique_warehouses),
    }


@app.get("/analytics/suppliers")
def supplier_analytics():
    """Supplier risk analytics."""
    if "ml" in _analysis_cache:
        return _analysis_cache["ml"]["risk_scores"]

    db = SessionLocal()
    try:
        rows = (
            db.query(
                SupplyData.supplier,
                func.count(SupplyData.id).label("rows"),
                func.avg(SupplyData.delay_days).label("avg_delay"),
                func.sum(SupplyData.cost).label("total_cost"),
            )
            .group_by(SupplyData.supplier)
            .order_by(func.avg(SupplyData.delay_days).desc())
            .all()
        )
    finally:
        db.close()

    return [
        {
            "supplier": r.supplier or "Unknown",
            "total_shipments": int(r.rows),
            "avg_delay": round(float(r.avg_delay), 1) if r.avg_delay else 0,  # type: ignore[call-overload]
            "total_cost": round(float(r.total_cost), 2) if r.total_cost else 0,  # type: ignore[call-overload]
            "risk_score": 0,
            "tier": "unknown",
        }
        for r in rows
    ]


@app.get("/analytics/time-series")
def time_series_analytics():
    """Time-series trends and forecasts."""
    if "ml" in _analysis_cache:
        return _analysis_cache["ml"]["time_series"]
    return {"delay_trend": [], "cost_trend": [], "volume_trend": [], "forecast": {}}


@app.get("/analytics/data-quality")
def data_quality():
    """Data quality assessment."""
    if "ml" in _analysis_cache:
        return _analysis_cache["ml"]["data_quality"]
    return {"completeness_pct": 0, "columns": {}}


# ============================================================
# ML ENDPOINTS
# ============================================================

@app.get("/ml/anomalies")
def get_anomalies():
    """Get detected anomalies."""
    if "ml" in _analysis_cache:
        return _analysis_cache["ml"]["anomalies"]
    return {"anomalies": [], "anomaly_count": 0}


@app.get("/ml/risk-scores")
def get_risk_scores():
    """Get supplier risk scores (0–100)."""
    if "ml" in _analysis_cache:
        return _analysis_cache["ml"]["risk_scores"]
    return []


@app.get("/ml/bullwhip")
def get_bullwhip():
    """Get bullwhip effect analysis."""
    if "ml" in _analysis_cache:
        return _analysis_cache["ml"].get("bullwhip_analysis", {})
    return {"bullwhip_ratio": 1.0, "status": "no_data"}


@app.get("/ml/full-analysis")
def get_full_analysis():
    """Get complete ML analysis results."""
    if "ml" in _analysis_cache:
        result = {k: v for k, v in _analysis_cache["ml"].items()}
        result["last_updated"] = _analysis_cache.get("last_updated")
        return result
    return {"error": "No analysis available. Upload data first."}


@app.post("/ml/refresh")
def refresh_analysis():
    """Re-run the full ML analysis pipeline."""
    _run_full_analysis()
    return {"status": "success", "last_updated": _analysis_cache.get("last_updated")}


# ============================================================
# GRAPH ENDPOINTS
# ============================================================

@app.get("/graph/summary")
def graph_summary():
    """Get graph overview statistics."""
    if "graph_summary" in _analysis_cache:
        return _analysis_cache["graph_summary"]
    return {"total_nodes": 0, "total_edges": 0}


@app.get("/graph/resilience")
def graph_resilience():
    """Get advanced resilience metrics."""
    if "graph_summary" in _analysis_cache:
        return _analysis_cache["graph_summary"].get("resilience_metrics", {})
    return {}


@app.get("/graph/centrality")
def graph_centrality():
    """Get node centrality scores."""
    if "centrality" in _analysis_cache:
        return _analysis_cache["centrality"]
    return {"degree": [], "betweenness": [], "pagerank": []}


@app.get("/graph/critical-paths")
def critical_paths():
    """Get critical bottleneck nodes."""
    if "critical_paths" in _analysis_cache:
        return _analysis_cache["critical_paths"]
    return []


@app.get("/graph/visualization")
def graph_visualization():
    """Get full graph data for frontend visualization."""
    if "graph_vis" in _analysis_cache:
        return _analysis_cache["graph_vis"]
    return {"nodes": [], "edges": []}


@app.get("/graph/cascade/{node_name}")
def cascade_simulation(node_name: str):
    """Simulate cascade failure for a specific node."""
    if not _analysis_cache:
        return {"error": "No analysis available"}
    return graph_engine.simulate_cascade(node_name)


# ============================================================
# AI CO-PILOT ENDPOINTS
# ============================================================

@app.get("/copilot/summary")
def executive_summary():
    """Get AI-generated executive risk summary."""
    if "executive_summary" in _analysis_cache:
        return _analysis_cache["executive_summary"]
    return {
        "overall_risk_level": "UNKNOWN",
        "risk_color": "#64748b",
        "narrative": "Upload data to generate analysis.",
        "recommendations": [],
        "key_metrics": {},
    }


@app.post("/copilot/ask")
def copilot_ask(body: dict):
    """Ask the AI Co-Pilot a question."""
    question = body.get("question", "")
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    risk_scores = _analysis_cache.get("ml", {}).get("risk_scores", [])
    anomalies = _analysis_cache.get("ml", {}).get("anomalies", {})
    summary = _analysis_cache.get("ml", {}).get("summary", {})
    graph_data = _analysis_cache.get("graph_vis")

    return ai_copilot.answer_question(question, risk_scores, anomalies, summary, graph_data)


@app.post("/copilot/what-if")
def copilot_whatif(body: dict):
    """Run a what-if scenario simulation."""
    scenario = body.get("scenario", "")
    if not scenario:
        raise HTTPException(status_code=400, detail="Scenario description is required")

    risk_scores = _analysis_cache.get("ml", {}).get("risk_scores", [])
    graph_data = _analysis_cache.get("graph_vis")
    summary = _analysis_cache.get("ml", {}).get("summary", {})

    return ai_copilot.what_if_simulation(scenario, risk_scores, graph_data, summary)


# ============================================================
# XAI ENDPOINTS
# ============================================================

@app.get("/xai/feature-importance")
def feature_importance():
    """Get feature importance analysis."""
    if "xai_importance" in _analysis_cache:
        return _analysis_cache["xai_importance"]
    return {"error": "No analysis available"}


@app.get("/xai/counterfactuals")
def counterfactuals():
    """Get counterfactual explanations."""
    if "xai_counterfactuals" in _analysis_cache:
        return _analysis_cache["xai_counterfactuals"]
    return []


# ============================================================
# EXPORT ENDPOINTS (Tableau / Power BI)
# ============================================================

@app.get("/export/csv")
def export_csv():
    """Export data as CSV for Tableau."""
    df = _load_dataframe()
    if df.empty:
        raise HTTPException(status_code=404, detail="No data to export")

    # Add computed risk scores
    risk_scores = _analysis_cache.get("ml", {}).get("risk_scores", [])
    risk_map = {s["supplier"]: s["risk_score"] for s in risk_scores}
    tier_map = {s["supplier"]: s["tier"] for s in risk_scores}

    df["risk_score"] = df["supplier"].map(risk_map).fillna(0)
    df["risk_tier"] = df["supplier"].map(tier_map).fillna("unknown")

    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=synchain_export.csv"},
    )


@app.get("/export/json")
def export_json():
    """Export analysis results as JSON for Power BI."""
    df = _load_dataframe()
    if df.empty:
        raise HTTPException(status_code=404, detail="No data to export")

    risk_scores = _analysis_cache.get("ml", {}).get("risk_scores", [])
    summary = _analysis_cache.get("ml", {}).get("summary", {})
    anomalies = _analysis_cache.get("ml", {}).get("anomalies", {})

    export_data = {
        "metadata": {
            "exported_at": datetime.utcnow().isoformat(),
            "platform": "SynChain 2.0",
            "total_records": len(df),
        },
        "summary": summary,
        "supplier_risk_scores": risk_scores,
        "anomalies": anomalies.get("anomalies", [])[:100],
        "raw_data": df.fillna("").to_dict(orient="records"),
    }

    output = json.dumps(export_data, indent=2, default=str)
    return StreamingResponse(
        iter([output]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=synchain_powerbi.json"},
    )


@app.get("/export/tableau-schema")
def tableau_schema():
    """Get Tableau-compatible schema description."""
    return {
        "table_name": "SynChain Supply Intelligence",
        "columns": [
            {"name": "supplier", "type": "string", "role": "dimension"},
            {"name": "sku", "type": "string", "role": "dimension"},
            {"name": "warehouse", "type": "string", "role": "dimension"},
            {"name": "region", "type": "string", "role": "dimension"},
            {"name": "delay_days", "type": "integer", "role": "measure"},
            {"name": "cost", "type": "float", "role": "measure"},
            {"name": "quantity", "type": "integer", "role": "measure"},
            {"name": "quality_score", "type": "float", "role": "measure"},
            {"name": "risk_score", "type": "float", "role": "measure"},
            {"name": "risk_tier", "type": "string", "role": "dimension"},
        ],
    }


# ============================================================
# SYSTEM ENDPOINTS
# ============================================================

@app.get("/system/health")
def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "analysis_cached": bool(_analysis_cache),
        "last_updated": _analysis_cache.get("last_updated"),
    }


@app.delete("/system/reset")
def reset_data():
    """Clear all data and analysis cache."""
    global _analysis_cache
    db = SessionLocal()
    try:
        db.query(SupplyData).delete()
        db.query(UploadHistory).delete()
        db.query(RiskEvent).delete()
        db.query(AnalysisResult).delete()
        db.query(SupplierProfile).delete()
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Reset error: {e}")
    finally:
        db.close()
    _analysis_cache = {}
    return {"status": "reset_complete"}


if __name__ == "__main__":
    import uvicorn  # type: ignore
    print(f"[SynChain] Starting API server on 0.0.0.0:8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
