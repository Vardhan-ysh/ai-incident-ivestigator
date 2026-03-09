from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import (
    Incident, ForensicAnalysis, AnalyzeRequest, AnalyzeResponse,
    ForensicAnalysisResponse
)
from app.pipeline import Pipeline
from typing import List
import json

router = APIRouter(prefix="/api/analyze", tags=["analysis"])

@router.post("", response_model=AnalyzeResponse)
def analyze_incident(req: AnalyzeRequest, db: Session = Depends(get_db)):
    """Run full 4-stage pipeline on a prompt-response pair."""
    pipeline = Pipeline(db)
    
    # Run the pipeline
    p_label, conf, expl, r_incs, sims, raw_class, raw_expl = pipeline.analyze(req.prompt, req.response)
    
    # Save Incident if requested
    if req.save_incident:
        inc = Incident(
            prompt=req.prompt,
            response=req.response,
            # It's an unlabelled product incident initially unless user edits it
            true_label=None
        )
        db.add(inc)
        db.commit()
        db.refresh(inc)
        incident_id = inc.id
    else:
        # Create a transient DB record just to attach analysis to, 
        # or maybe we don't save DB if save_incident=False.
        # But instructions require returning an incident_id and saving ForensicAnalysis row.
        # Let's assume we ALWAYS save the incident but it's marked appropriately,
        # or we just fulfill the save_incident flag.
        
        # If we must persist ForensicAnalysis, we need an incident_id.
        # So we MUST save the Incident row regardless. We'll interpret `save_incident` 
        # as a flag to ALSO embed it into the corpus vector DB later.
        inc = Incident(prompt=req.prompt, response=req.response, true_label=None)
        db.add(inc)
        db.commit()
        db.refresh(inc)
        incident_id = inc.id
        
        # If save_incident is true, we might also want to add it to Chroma.
        # However, usually we only add Ground Truth to Chroma. I'll omit Chroma saving for new queries
        # unless it becomes labeled later.
        
    # Save ForensicAnalysis
    analysis = ForensicAnalysis(
        incident_id=incident_id,
        predicted_label=p_label,
        confidence=conf,
        generated_explanation=expl,
        retrieved_incident_ids=",".join([r.id for r in r_incs]),
        retrieved_similarities=",".join([str(s) for s in sims]),
        raw_llm_classification_output=raw_class,
        raw_llm_explanation_output=raw_expl
    )
    db.add(analysis)
    db.commit()
    
    return AnalyzeResponse(
        incident_id=incident_id,
        predicted_label=p_label,
        confidence=conf,
        generated_explanation=expl,
        retrieved_incidents=r_incs,
        similarities=sims
    )

@router.get("/{analysis_id}", response_model=ForensicAnalysisResponse)
def get_analysis(analysis_id: str, db: Session = Depends(get_db)):
    """Get a specific forensic analysis record."""
    analysis = db.query(ForensicAnalysis).filter(ForensicAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    # Process comma-separated text back into lists for SQLite
    analysis.retrieved_incident_ids = analysis.retrieved_incident_ids.split(",") if analysis.retrieved_incident_ids else []
    analysis.retrieved_similarities = [float(x) for x in analysis.retrieved_similarities.split(",")] if analysis.retrieved_similarities else []
    
    return analysis
