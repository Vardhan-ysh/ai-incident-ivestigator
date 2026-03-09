"""
Analysis route — POST /api/analyze and GET /api/analysis/{id}.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import (
    AnalyzeRequest,
    AnalyzeResponse,
    ForensicAnalysis,
    ForensicAnalysisResponse,
)
from app.pipeline import run_analysis

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_incident(request: AnalyzeRequest, db: Session = Depends(get_db)):
    """Run the full forensic analysis pipeline on a prompt-response pair."""
    return run_analysis(request, db)


@router.get("/analysis/{analysis_id}", response_model=ForensicAnalysisResponse)
def get_analysis(analysis_id: str, db: Session = Depends(get_db)):
    """Retrieve a saved forensic analysis by its ID."""
    analysis = db.query(ForensicAnalysis).filter(ForensicAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return ForensicAnalysisResponse(
        id=analysis.id,
        incident_id=analysis.incident_id,
        predicted_label=analysis.predicted_label,
        confidence=analysis.confidence,
        generated_explanation=analysis.generated_explanation,
        retrieved_incident_ids=analysis.retrieved_incident_ids.split(",") if analysis.retrieved_incident_ids else [],
        retrieved_similarities=[float(s) for s in analysis.retrieved_similarities.split(",")]
            if analysis.retrieved_similarities else [],
        created_at=analysis.created_at,
    )
