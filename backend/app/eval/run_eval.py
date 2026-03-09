import os
import argparse
import requests
import json

def run_evaluation(api_url: str, incident_ids: list[str]):
    print(f"Running evaluation via API on {len(incident_ids)} incidents...")
    res = requests.post(
        f"{api_url}/api/evaluate",
        json={"incident_ids": incident_ids}
    )
    if res.status_code == 200:
        data = res.json()
        print("\n=== EVALUATION RESULTS ===")
        print(f"Total Evaluated: {data['total_evaluated']}")
        print(f"Accuracy: {data['accuracy']:.4f}")
        print(f"Macro F1: {data['macro_f1']:.4f}")
        print(f"Expected Calibration Error (ECE): {data['expected_calibration_error']:.4f}")
        print("\nPer-Class Metrics:")
        print(json.dumps(data['per_class_metrics'], indent=2))
    else:
        print(f"Evaluation failed: {res.status_code} - {res.text}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Forensic Analyzer Pipeline")
    parser.add_argument("--api-url", default="http://localhost:8000", help="Base URL of FastAPI server")
    parser.add_argument("--ids", nargs="+", help="Incident IDs to evaluate. Omit to evaluate ALL incidents.")
    args = parser.parse_args()
    
    ids_to_eval = args.ids
    if not ids_to_eval:
        # Fetch all incidents
        print("Fetching incidents from TEST split to determine dataset...")
        try:
            res = requests.get(f"{args.api_url}/api/incidents?limit=1000")
            if res.status_code == 200:
                incidents = res.json()
                ids_to_eval = [inc["id"] for inc in incidents if inc.get("true_label") and inc.get("split") == "test"]
                if not ids_to_eval:
                    # Fallback to any labeled incidents if no test split is explicitly defined
                    ids_to_eval = [inc["id"] for inc in incidents if inc.get("true_label")]
                print(f"Found {len(ids_to_eval)} labeled incidents in DB for evaluation.")
            else:
                print("Failed to fetch incidents.")
                exit(1)
        except requests.exceptions.ConnectionError:
            print("Cannot connect to API server. Ensure backend is running.")
            exit(1)
            
    if ids_to_eval:
        run_evaluation(args.api_url, ids_to_eval)
    else:
        print("No labeled incidents available for evaluation.")
