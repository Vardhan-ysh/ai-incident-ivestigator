export type IncidentType =
  | "hallucination"
  | "bias"
  | "policy_violation"
  | "safe";

export interface RetrievedIncident {
  id: string;
  prompt_snippet: string;
  response_snippet: string;
  true_label: IncidentType | null;
  severity: number | null;
  similarity: number;
  reference_explanation?: string | null;
}

export interface AnalyzeRequest {
  prompt: string;
  response: string;
  save_incident: boolean;
}

export interface AnalyzeResponse {
  incident_id: string;
  predicted_label: IncidentType;
  confidence: number;
  generated_explanation: string;
  retrieved_incidents: RetrievedIncident[];
  similarities: number[];
}

export interface Incident {
  id: string;
  prompt: string;
  response: string;
  true_label: IncidentType | null;
  severity: number | null;
  split?: string | null;
  reference_explanation?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvaluationResponse {
  total_evaluated: number;
  accuracy: number;
  macro_f1: number;
  expected_calibration_error: number;
  rouge_l: number;           // ROUGE-L vs reference_explanation (paper §III.D)
  grounding_ratio: number;   // % explanations citing retrieved incidents (paper C2)
  per_class_metrics: Record<string, any>;
}
