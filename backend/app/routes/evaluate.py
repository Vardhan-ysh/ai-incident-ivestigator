from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import IncidentType, AnalyzeRequest
from app.pipeline import run_analysis
from sklearn.metrics import classification_report, f1_score
import numpy as np
import json

router = APIRouter(prefix="/api/evaluate", tags=["evaluation"])

class EvalIncidentRef(BaseModel):
    id: str  # id of an existing labelled incident in DB

class EvaluationRequest(BaseModel):
    incident_ids: List[str]  # Which incidents to evaluate on.

class EvaluationResponse(BaseModel):
    total_evaluated: int
    accuracy: float
    macro_f1: float
    per_class_metrics: Dict[str, Any]
    expected_calibration_error: float

def compute_ece(confidences: np.ndarray, accuracies: np.ndarray, num_bins: int = 10) -> float:
    """Compute Expected Calibration Error (ECE)."""
    bins = np.linspace(0, 1, num_bins + 1)
    ece = 0.0
    total = len(confidences)
    
    if total == 0:
        return 0.0
    
    for i in range(num_bins):
        bin_lower = bins[i]
        bin_upper = bins[i+1]
        
        in_bin = (confidences > bin_lower) & (confidences <= bin_upper)
        if i == 0:
            in_bin = in_bin | (confidences == 0)
            
        bin_size = np.sum(in_bin)
        if bin_size > 0:
            bin_conf = np.mean(confidences[in_bin])
            bin_acc = np.mean(accuracies[in_bin])
            ece += (bin_size / total) * np.abs(bin_conf - bin_acc)
            
    return float(ece)

@router.post("", response_model=EvaluationResponse)
def run_evaluation(req: EvaluationRequest, db: Session = Depends(get_db)):
    """Run full pipeline evaluation on a set of known labeled incidents."""
    from app.models import Incident
    
    # Grab the true incidents - filter by test split if desired, or use the provided ones.
    query = db.query(Incident).filter(Incident.id.in_(req.incident_ids))
    
    incidents = query.all()
    incidents = [i for i in incidents if i.true_label] # ensure they have a true label
    
    if not incidents:
        return EvaluationResponse(
            total_evaluated=0, accuracy=0.0, macro_f1=0.0, per_class_metrics={}, expected_calibration_error=0.0
        )

    y_true = []
    y_pred = []
    confidences = []
    
    for inc in incidents:
        # Run pipeline
        try:
            req = AnalyzeRequest(prompt=inc.prompt, response=inc.response, save_incident=False)
            res = run_analysis(req, db)
            y_true.append(inc.true_label.value)
            y_pred.append(res.predicted_label)
            confidences.append(res.confidence)
        except Exception as e:
            print(f"Error evaluating incident {inc.id}: {e}")
            continue
            
    if not y_true:
        return EvaluationResponse(
            total_evaluated=0, accuracy=0.0, macro_f1=0.0, per_class_metrics={}, expected_calibration_error=0.0
        )
        
    y_true_np = np.array(y_true)
    y_pred_np = np.array(y_pred)
    conf_np = np.array(confidences)
    accuracies = (y_true_np == y_pred_np).astype(float)
    
    macro_f1 = f1_score(y_true, y_pred, average='macro', zero_division=0)
    acc = np.mean(accuracies)
    
    # Classification report (dict)
    labels = [e.value for e in IncidentType]
    report = classification_report(y_true, y_pred, labels=labels, output_dict=True, zero_division=0)
    
    ece = compute_ece(conf_np, accuracies)
    
    return EvaluationResponse(
        total_evaluated=len(y_true),
        accuracy=float(acc),
        macro_f1=float(macro_f1),
        per_class_metrics=report,
        expected_calibration_error=ece
    )
