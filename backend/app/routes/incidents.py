from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db import get_db
from app.models import Incident, IncidentCreate, IncidentResponse, IncidentType, IncidentDetailResponse
from app.vectorstore import add_incident_to_vectorstore
from typing import List, Optional

router = APIRouter()

@router.post("/", response_model=IncidentResponse)
def create_incident(incident_in: IncidentCreate, db: Session = Depends(get_db)):
    """
    Add a labeled historical incident.
    Computes embedding and stores in Vector DB as well.
    """
    db_incident = Incident(
        prompt=incident_in.prompt,
        response=incident_in.response,
        true_label=incident_in.true_label,
        severity=incident_in.severity,
        reference_explanation=incident_in.reference_explanation
    )
    
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    
    # Store in ChromaDB
    try:
        add_incident_to_vectorstore(
            incident_id=db_incident.id,
            prompt=db_incident.prompt,
            response=db_incident.response,
            metadata={"true_label": db_incident.true_label, "severity": db_incident.severity}
        )
    except Exception as e:
        # If vector DB fails, we should ideally rollback or queue it, but for simplicity we log error
        print(f"Failed to add to vectorstore: {e}")
        
    return db_incident

@router.get("/", response_model=List[IncidentResponse])
def get_incidents(
    skip: int = 0, 
    limit: int = 100, 
    label: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List historical incidents.
    """
    query = db.query(Incident)
    if label:
        query = query.filter(Incident.true_label == label)
    
    incidents = query.order_by(Incident.created_at.desc()).offset(skip).limit(limit).all()
    return incidents

@router.get("/{incident_id}", response_model=IncidentDetailResponse)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


class LabelPatchRequest(BaseModel):
    """Payload for human-verification labeling of an incident."""
    true_label: Optional[IncidentType] = None
    severity: Optional[float] = None        # 0.0 – 1.0
    reference_explanation: Optional[str] = None


@router.patch("/{incident_id}", response_model=IncidentResponse)
def label_incident(
    incident_id: str,
    patch: LabelPatchRequest,
    db: Session = Depends(get_db),
):
    """
    Human-verification endpoint: set true_label, severity, and/or
    reference_explanation on an existing incident.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if patch.true_label is not None:
        incident.true_label = patch.true_label
    if patch.severity is not None:
        incident.severity = max(0.0, min(1.0, patch.severity))
    if patch.reference_explanation is not None:
        incident.reference_explanation = patch.reference_explanation

    db.commit()
    db.refresh(incident)

    # Keep ChromaDB metadata in sync so retrieval reflects the verified label
    try:
        from app.vectorstore import get_collection
        col = get_collection()
        col.update(
            ids=[incident_id],
            metadatas=[{
                "true_label": incident.true_label.value if incident.true_label else "",
                "severity": incident.severity or 0.0,
            }],
        )
    except Exception as e:
        print(f"ChromaDB metadata update failed (non-fatal): {e}")

    return incident
