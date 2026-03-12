import math
import logging
from typing import List

from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    Incident,
    ForensicAnalysis,
    AnalyzeRequest,
    AnalyzeResponse,
    RetrievedIncidentSchema,
)
from app.vectorstore import vectorstore
from app.llm_client import llm_client
from app.detectors import detect_signals

logger = logging.getLogger(__name__)


def format_incident_for_embedding(prompt: str, response: str) -> str:
    return f"{prompt}\n\n[MODEL RESPONSE]\n\n{response}"


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def run_analysis(request: AnalyzeRequest, db: Session) -> AnalyzeResponse:
    query_text = format_incident_for_embedding(request.prompt, request.response)
    incident_ids, similarities = vectorstore.retrieve_similar(
        query_text, k=settings.retrieval_k
    )

    retrieved_incidents: List[RetrievedIncidentSchema] = []
    context_parts: List[str] = []

    for idx, (inc_id, sim) in enumerate(zip(incident_ids, similarities)):
        inc = db.query(Incident).filter(Incident.id == inc_id).first()
        if not inc:
            continue
        retrieved_incidents.append(
            RetrievedIncidentSchema(
                id=inc.id,
                prompt_snippet=inc.prompt[:200],
                response_snippet=inc.response[:200],
                true_label=inc.true_label,
                severity=inc.severity,
                similarity=sim,
                reference_explanation=inc.reference_explanation,
            )
        )
        label_str = inc.true_label.value if inc.true_label else "unknown"
        context_parts.append(
            f"### Incident {idx + 1} (label={label_str}, similarity={sim:.3f})\n"
            f"Prompt: {inc.prompt[:300]}\n"
            f"Response: {inc.response[:300]}\n"
        )

    retrieved_context = "\n".join(context_parts) if context_parts else "No similar incidents found."

    # v2: Deterministic Layer
    detection = detect_signals(request.prompt, request.response)
    deterministic_text = ""
    if detection.has_hits:
        deterministic_text = "\n".join([f"- {s.label.value}: {s.reason}" for s in detection.signals])

    classification = llm_client.classify_incident(
        prompt=request.prompt,
        response=request.response,
        retrieved_context=retrieved_context,
        deterministic_signals=deterministic_text if detection.has_hits else None
    )
    predicted_label = classification["predicted_label"]

    # v2: Composite Confidence Calculation (Evidence Strength)
    # Factor A: Retrieval Density (how familiar is this case?)
    if similarities:
        mean_sim = sum(similarities) / len(similarities)
    else:
        mean_sim = 0.0
    
    retrieval_strength = _sigmoid(
        settings.calib_alpha * mean_sim + settings.calib_beta
    )

    # Factor B: Agreement (do rules and LLM agree?)
    agreement_bonus = 0.0
    if detection.has_hits:
        # If any rule hit matches the LLM prediction, we have high agreement
        if any(s.label.value == predicted_label for s in detection.signals):
            agreement_bonus = 0.2
        else:
            agreement_bonus = -0.1 # Slight penalty for disagreement

    # Final "Evidence Strength" capped at 1.0
    # Weighted 70% retrieval familiarity, 30% agreement/rules
    calibrated_confidence = min(1.0, retrieval_strength + agreement_bonus)

    explanation_result = llm_client.generate_explanation(
        prompt=request.prompt,
        response=request.response,
        predicted_label=predicted_label,
        retrieved_context=retrieved_context,
    )

    if request.save_incident:
        db_incident = Incident(
            prompt=request.prompt,
            response=request.response,
            # true_label stays null — this is an unlabelled production incident.
            # The predicted_label lives in ForensicAnalysis (per paper §III.A).
        )
        db.add(db_incident)
        db.commit()
        db.refresh(db_incident)

        analysis = ForensicAnalysis(
            incident_id=db_incident.id,
            predicted_label=predicted_label,
            confidence=calibrated_confidence,
            generated_explanation=explanation_result["explanation"],
            retrieved_incident_ids=",".join(incident_ids),
            retrieved_similarities=",".join(f"{s:.4f}" for s in similarities),
            raw_llm_classification_output=classification.get("raw_output", ""),
            raw_llm_explanation_output=explanation_result.get("raw_output", ""),
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        incident_id = db_incident.id
    else:
        # Ephemeral analysis only — generate a transient ID, nothing persisted.
        import uuid
        incident_id = str(uuid.uuid4())

    return AnalyzeResponse(
        incident_id=incident_id,
        predicted_label=predicted_label,
        confidence=calibrated_confidence,
        generated_explanation=explanation_result["explanation"],
        retrieved_incidents=retrieved_incidents,
        similarities=similarities,
        detection_signals=[s.model_dump() for s in detection.signals] if detection.has_hits else []
    )
