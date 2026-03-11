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
    rouge_l: float        # Paper Section III.D – explanation quality
    grounding_ratio: float  # Paper constraint C2 – % explanations referencing retrieved incidents

def compute_ece(confidences: np.ndarray, accuracies: np.ndarray, num_bins: int = 10) -> float:
    """Compute Expected Calibration Error (ECE) per paper Section III.D."""
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


def _lcs_length(a: List[str], b: List[str]) -> int:
    """Longest common subsequence length (word-level)."""
    m, n = len(a), len(b)
    if m == 0 or n == 0:
        return 0
    # Space-optimised DP
    prev = [0] * (n + 1)
    for i in range(1, m + 1):
        curr = [0] * (n + 1)
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                curr[j] = prev[j - 1] + 1
            else:
                curr[j] = max(prev[j], curr[j - 1])
        prev = curr
    return prev[n]


def rouge_l_sentence(hypothesis: str, reference: str) -> float:
    """Sentence-level ROUGE-L F1 score (word tokens)."""
    if not hypothesis.strip() or not reference.strip():
        return 0.0
    h_tokens = hypothesis.lower().split()
    r_tokens = reference.lower().split()
    lcs = _lcs_length(h_tokens, r_tokens)
    if lcs == 0:
        return 0.0
    precision = lcs / len(h_tokens)
    recall = lcs / len(r_tokens)
    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)


def _is_grounded(explanation: str) -> bool:
    """
    Heuristic for constraint C2: explanation references retrieved incidents.
    Looks for explicit marker phrases the LLM is prompted to include.
    """
    lower = explanation.lower()
    markers = [
        "incident", "similar", "historical", "retrieved", "case", "pattern",
        "previous", "reference", "example", "analogous",
    ]
    return any(m in lower for m in markers)


@router.post("", response_model=EvaluationResponse)
def run_evaluation(req: EvaluationRequest, db: Session = Depends(get_db)):
    """Run full pipeline evaluation on a set of known labeled incidents."""
    from app.models import Incident
    
    # Grab the true incidents - filter by test split if desired, or use the provided ones.
    query = db.query(Incident).filter(Incident.id.in_(req.incident_ids))
    
    incidents = query.all()
    incidents = [i for i in incidents if i.true_label]  # ensure they have a true label
    
    if not incidents:
        return EvaluationResponse(
            total_evaluated=0, accuracy=0.0, macro_f1=0.0, per_class_metrics={},
            expected_calibration_error=0.0, rouge_l=0.0, grounding_ratio=0.0
        )

    y_true = []
    y_pred = []
    confidences = []
    rouge_scores = []
    grounded_count = 0
    
    for inc in incidents:
        try:
            analyze_req = AnalyzeRequest(prompt=inc.prompt, response=inc.response, save_incident=False)
            res = run_analysis(analyze_req, db)

            y_true.append(inc.true_label.value)
            y_pred.append(res.predicted_label)
            confidences.append(res.confidence)

            # ROUGE-L against reference explanation (paper Section III.D)
            if inc.reference_explanation:
                rl = rouge_l_sentence(res.generated_explanation, inc.reference_explanation)
                rouge_scores.append(rl)

            # Grounding ratio (paper constraint C2)
            if _is_grounded(res.generated_explanation):
                grounded_count += 1

        except Exception as e:
            print(f"Error evaluating incident {inc.id}: {e}")
            continue
            
    if not y_true:
        return EvaluationResponse(
            total_evaluated=0, accuracy=0.0, macro_f1=0.0, per_class_metrics={},
            expected_calibration_error=0.0, rouge_l=0.0, grounding_ratio=0.0
        )
        
    y_true_np = np.array(y_true)
    y_pred_np = np.array(y_pred)
    conf_np = np.array(confidences)
    accuracies_arr = (y_true_np == y_pred_np).astype(float)
    
    macro_f1 = f1_score(y_true, y_pred, average='macro', zero_division=0)
    acc = float(np.mean(accuracies_arr))
    
    # Classification report with per-class precision/recall/F1
    labels = [e.value for e in IncidentType]
    report = classification_report(y_true, y_pred, labels=labels, output_dict=True, zero_division=0)
    
    ece = compute_ece(conf_np, accuracies_arr)
    avg_rouge_l = float(np.mean(rouge_scores)) if rouge_scores else 0.0
    grounding_ratio = grounded_count / len(y_true) if y_true else 0.0
    
    return EvaluationResponse(
        total_evaluated=len(y_true),
        accuracy=acc,
        macro_f1=float(macro_f1),
        per_class_metrics=report,
        expected_calibration_error=ece,
        rouge_l=avg_rouge_l,
        grounding_ratio=grounding_ratio,
    )
