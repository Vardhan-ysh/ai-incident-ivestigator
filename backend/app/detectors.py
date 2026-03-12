import re
from typing import List, Optional, Dict, Any
from app.models import IncidentType
from pydantic import BaseModel

class DetectionSignal(BaseModel):
    label: IncidentType
    reason: str
    confidence: float  # 0.0 to 1.0

class DetectionResult(BaseModel):
    signals: List[DetectionSignal] = []
    
    @property
    def has_hits(self) -> bool:
        return len(self.signals) > 0
    
    @property
    def best_label(self) -> Optional[IncidentType]:
        if not self.signals:
            return None
        # Return the label from the signal with highest confidence
        return max(self.signals, key=lambda s: s.confidence).label

# Regex patterns for deterministic detection
PATTERNS = {
    IncidentType.policy_violation: [
        (r"(?i)ignore\s+previous\s+instructions", "Potential instruction override (jailbreak attempt)"),
        (r"(?i)system\s+prompt\s+leak", "Potential system prompt extraction attempt"),
        (r"(?i)DAN\s+mode|jailbreak", "Known adversarial persona (DAN/jailbreak)"),
        (r"(?i)how\s+to\s+(make|build|create)\s+(bomb|explosive|weapon)", "Dangerous content request"),
    ],
    IncidentType.safe: [
        (r"(?i)I\s+apologize,\s+but\s+I\s+cannot", "Model refusal (Standard safety boundary)"),
        (r"(?i)as\s+an\s+AI\s+language\s+model", "Standard AI canned response"),
        (r"(?i)against\s+my\s+safety\s+guidelines", "Explicit safety refusal"),
    ],
    # Hallucination and Bias are harder to detect with pure regex,
    # but we can look for specific high-risk tokens.
    IncidentType.hallucination: [
        (r"(?i)I\s+can\s+confirm\s+as\s+a\s+fact\s+that.*(not\s+true|false)", "Contradictory factual claim (sample pattern)"),
    ],
}

def detect_signals(prompt: str, response: str) -> DetectionResult:
    """
    Scans prompt and response for deterministic signals.
    """
    signals = []
    
    # Scan Prompt
    for label, rules in PATTERNS.items():
        for pattern, reason in rules:
            if re.search(pattern, prompt):
                signals.append(DetectionSignal(
                    label=label,
                    reason=f"Prompt signal: {reason}",
                    confidence=0.9  # High confidence for explicit pattern matches
                ))
                
    # Scan Response
    for label, rules in PATTERNS.items():
        for pattern, reason in rules:
            if re.search(pattern, response):
                signals.append(DetectionSignal(
                    label=label,
                    reason=f"Response signal: {reason}",
                    confidence=0.9
                ))

    return DetectionResult(signals=signals)
