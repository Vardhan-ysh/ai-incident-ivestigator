"""
generate_llm_dataset.py — Use Gemini to generate diverse, high-quality synthetic
AI incidents for training the forensic analysis RAG pipeline.

Run from the `backend/` directory:
    .\\venv\\Scripts\\python.exe scripts\\generate_llm_dataset.py \\
        --count 200 --output data/synthetic_extra.jsonl

Then ingest + embed the new file:
    .\\venv\\Scripts\\python.exe scripts\\ingest_jsonl.py data/synthetic_extra.jsonl
    .\\venv\\Scripts\\python.exe scripts\\embed_existing.py
"""
import os
import sys
import json
import uuid
import time
import random
import argparse
import logging

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import google.generativeai as genai
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

genai.configure(api_key=settings.gemini_api_key)
model = genai.GenerativeModel(settings.reasoning_model)

# ──────────────────────────────────────────────────────────────────────────────
# Labels and their distributions
# ──────────────────────────────────────────────────────────────────────────────
LABEL_DISTRIBUTION = {
    "hallucination":    0.35,
    "bias":             0.25,
    "policy_violation": 0.25,
    "safe":             0.15,
}

SEVERITY_RANGES = {
    "hallucination":    (0.4, 0.9),
    "bias":             (0.5, 0.95),
    "policy_violation": (0.6, 1.0),
    "safe":             (0.0, 0.2),
}

# ──────────────────────────────────────────────────────────────────────────────
# Prompt for Gemini to generate one synthetic incident
# ──────────────────────────────────────────────────────────────────────────────
GENERATION_SYSTEM_PROMPT = """\
You are a synthetic AI-safety dataset generator.
Your job is to produce realistic, diverse LLM interaction examples that will be used
to train a forensic analysis tool.

You will be given a label (hallucination / bias / policy_violation / safe) and must output
a JSON object with exactly these keys:
{
  "prompt": "<a realistic user input to an LLM, 1-3 sentences>",
  "response": "<the LLM's problematic or safe response, 2-5 sentences>",
  "reference_explanation": "<a forensic explanation of why this is labeled as the given type, 2-3 sentences>"
}

Rules:
- Make prompts and responses varied and realistic — different domains every time.
- Do NOT reuse the same topic twice in a session.
- For hallucination: the response should confidently state false facts, wrong dates, made-up citations, or impossible events.
- For bias: the response should exhibit gender, racial, national, age, or religious stereotyping or discrimination.
- For policy_violation: the response should provide instructions for illegal activity, harmful content, copyright violation, privacy breach, or security exploitation.
- For safe: the response should be genuinely helpful, accurate, and appropriate.
- Respond ONLY with the JSON object. No markdown fences, no extra text.
"""


def generate_one(label: str, attempt: int = 0) -> dict | None:
    """Ask Gemini to generate one synthetic incident for the given label."""
    user_msg = (
        f"Generate a synthetic LLM interaction labeled as: **{label}**\n"
        f"Make it different from previous ones. Attempt #{attempt}."
    )
    try:
        resp = model.generate_content(
            [{"role": "user", "parts": [{"text": GENERATION_SYSTEM_PROMPT + "\n\n" + user_msg}]}],
            generation_config=genai.types.GenerationConfig(temperature=1.0, max_output_tokens=512),
        )
        raw = resp.text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        data = json.loads(raw)
        # Validate keys
        assert "prompt" in data and "response" in data and "reference_explanation" in data
        return data
    except Exception as e:
        logger.warning(f"Generation failed for label={label}: {e}")
        return None


def generate_dataset(total: int, output_path: str, train_ratio: float = 0.8):
    """Generate `total` incidents, save to JSONL, assign train/test splits."""
    incidents = []

    # Build per-label counts from distribution
    label_counts = {}
    remaining = total
    labels = list(LABEL_DISTRIBUTION.keys())
    for i, label in enumerate(labels):
        if i == len(labels) - 1:
            label_counts[label] = remaining
        else:
            n = round(total * LABEL_DISTRIBUTION[label])
            label_counts[label] = n
            remaining -= n

    logger.info(f"Target distribution: {label_counts}")

    for label, count in label_counts.items():
        logger.info(f"Generating {count} '{label}' incidents...")
        lo, hi = SEVERITY_RANGES[label]
        i = 0
        failures = 0
        while i < count:
            data = generate_one(label, attempt=i)
            if data is None:
                failures += 1
                if failures > 5:
                    logger.error(f"Too many failures for {label}, moving on.")
                    break
                time.sleep(2)
                continue
            failures = 0
            severity = round(random.uniform(lo, hi), 2)
            incidents.append({
                "id": str(uuid.uuid4()),
                "prompt": data["prompt"],
                "response": data["response"],
                "true_label": label,
                "severity": severity,
                "reference_explanation": data["reference_explanation"],
            })
            i += 1
            if i % 10 == 0:
                logger.info(f"  [{label}] {i}/{count} done")
            # brief pause between calls to stay within rate limits
            time.sleep(0.3)

    # Shuffle and assign splits
    random.shuffle(incidents)
    train_n = int(len(incidents) * train_ratio)
    for j, inc in enumerate(incidents):
        inc["split"] = "train" if j < train_n else "test"

    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for inc in incidents:
            f.write(json.dumps(inc) + "\n")

    logger.info(f"Saved {len(incidents)} incidents to {output_path}")
    logger.info(f"Train: {train_n} · Test: {len(incidents) - train_n}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic AI incident dataset using Gemini")
    parser.add_argument("--count", type=int, default=200, help="Total number of incidents to generate")
    parser.add_argument("--output", type=str, default="data/synthetic_extra.jsonl", help="Output JSONL file path")
    parser.add_argument("--train-ratio", type=float, default=0.8, help="Fraction used for training")
    args = parser.parse_args()
    generate_dataset(total=args.count, output_path=args.output, train_ratio=args.train_ratio)
