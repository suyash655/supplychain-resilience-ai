from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON  # type: ignore
from sqlalchemy.orm import declarative_base  # type: ignore
from datetime import datetime, timezone

Base = declarative_base()


def _utcnow():
    """UTC-aware timestamp helper."""
    return datetime.now(timezone.utc)


class SupplyData(Base):
    """Core supply chain transaction records — each row = one shipment/order event."""
    __tablename__ = "supply_data"

    id = Column(Integer, primary_key=True, index=True)
    supplier = Column(String, index=True)
    sku = Column(String, index=True)
    warehouse = Column(String, nullable=True)
    region = Column(String, nullable=True)
    shipment_id = Column(String, nullable=True)
    order_date = Column(String, nullable=True)
    delivery_date = Column(String, nullable=True)
    delay_days = Column(Integer, default=0)
    cost = Column(Float, default=0)
    quantity = Column(Integer, default=0)
    category = Column(String, nullable=True)
    quality_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    def __repr__(self):
        return f"<SupplyData id={self.id} supplier={self.supplier!r} sku={self.sku!r}>"


class SupplierProfile(Base):
    """Aggregated supplier intelligence — computed from SupplyData."""
    __tablename__ = "supplier_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    location = Column(String, nullable=True)
    tier = Column(String, default="standard")  # critical, standard, low
    risk_score = Column(Float, default=0)       # 0–100
    reliability_score = Column(Float, default=100)
    avg_delay = Column(Float, default=0)
    total_shipments = Column(Integer, default=0)
    total_cost = Column(Float, default=0)
    anomaly_count = Column(Integer, default=0)
    last_updated = Column(DateTime, default=_utcnow)

    def __repr__(self):
        return f"<SupplierProfile id={self.id} name={self.name!r} tier={self.tier!r}>"


class RiskEvent(Base):
    """Detected risk events — anomalies, spikes, disruptions."""
    __tablename__ = "risk_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String)       # anomaly, delay_spike, cost_surge, quality_drop
    severity = Column(String)         # low, medium, high, critical
    risk_score = Column(Float)        # 0–100
    supplier = Column(String, nullable=True)
    sku = Column(String, nullable=True)
    region = Column(String, nullable=True)
    description = Column(Text)
    root_cause = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    def __repr__(self):
        return f"<RiskEvent id={self.id} type={self.event_type!r} severity={self.severity!r}>"


class AnalysisResult(Base):
    """Cached ML analysis results for fast retrieval."""
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    analysis_type = Column(String, index=True)  # risk_scores, anomaly, forecast, graph, xai
    result_json = Column(JSON)
    parameters = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=_utcnow)


class UploadHistory(Base):
    """Track all file uploads for data versioning."""
    __tablename__ = "upload_history"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    file_type = Column(String)       # csv, xlsx
    rows_total = Column(Integer)
    rows_inserted = Column(Integer)
    rows_rejected = Column(Integer)
    columns_detected = Column(JSON)
    column_mapping = Column(JSON, nullable=True)
    data_quality_report = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    def __repr__(self):
        return f"<UploadHistory id={self.id} file={self.filename!r}>"
