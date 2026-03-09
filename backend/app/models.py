import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Text, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db import Base
from pydantic import BaseModel, Field
from typing import Optional, List, Any

# ==========================================
# ENUMS
# ==========================================
class IncidentType(str, enum.Enum):
    hallucination = "hallucination"
    bias = "bias"
    policy_violation = "policy_violation"
    safe = "safe"

# ==========================================
# SQLALCHEMY MODELS
# ==========================================
def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, default=generate_uuid)
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    
    # true_label can be null for production unlabelled incidents
    true_label = Column(Enum(IncidentType), nullable=True)
    severity = Column(Float, nullable=True)  # 0 to 1
    
    # Only for corpus incidents
    reference_explanation = Column(Text, nullable=True)
    
    # Data split: train or test
    split = Column(String, nullable=True, default="train")
    
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    analyses = relationship("ForensicAnalysis", back_populates="incident", cascade="all, delete-orphan")

class ForensicAnalysis(Base):
    __tablename__ = "forensic_analyses"

    id = Column(String, primary_key=True, default=generate_uuid)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False)
    
    predicted_label = Column(Enum(IncidentType), nullable=False)
    confidence = Column(Float, nullable=False)  # 0 to 1
    generated_explanation = Column(Text, nullable=False)
    
    # Storing array as comma-separated string in SQLite for simplicity
    retrieved_incident_ids = Column(Text, nullable=True)
    retrieved_similarities = Column(Text, nullable=True)
    
    raw_llm_classification_output = Column(Text, nullable=True)
    raw_llm_explanation_output = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=utc_now)

    incident = relationship("Incident", back_populates="analyses")

# ==========================================
# PYDANTIC SCHEMAS
# ==========================================

class IncidentBase(BaseModel):
    prompt: str
    response: str
    true_label: Optional[IncidentType] = None
    severity: Optional[float] = Field(None, ge=0.0, le=1.0)
    reference_explanation: Optional[str] = None

class CreateIncidentRequest(IncidentBase):
    pass

class IncidentCreate(IncidentBase):
    pass

class IncidentResponse(IncidentBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RetrievedIncidentSchema(BaseModel):
    id: str
    prompt_snippet: str
    response_snippet: str
    true_label: Optional[IncidentType]
    severity: Optional[float]
    similarity: float
    reference_explanation: Optional[str] = None

class AnalyzeRequest(BaseModel):
    prompt: str
    response: str
    save_incident: bool = False
    context_metadata: Optional[dict] = None  # Future expansion

class AnalyzeResponse(BaseModel):
    incident_id: str
    predicted_label: IncidentType
    confidence: float
    generated_explanation: str
    retrieved_incidents: List[RetrievedIncidentSchema]
    similarities: List[float]

class ForensicAnalysisResponse(BaseModel):
    id: str
    incident_id: str
    predicted_label: IncidentType
    confidence: float
    generated_explanation: str
    retrieved_incident_ids: List[str]
    retrieved_similarities: List[float]
    created_at: datetime

    class Config:
        from_attributes = True

class IncidentDetailResponse(IncidentResponse):
    analyses: List[ForensicAnalysisResponse] = []
