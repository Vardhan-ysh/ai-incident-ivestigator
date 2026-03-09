import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface Incident {
  id: string;
  prompt: string;
  response: string;
  true_label?: string;
  severity?: number;
  reference_explanation?: string;
  created_at: string;
}

export interface RetrievedIncident {
  id: string;
  prompt_snippet: string;
  response_snippet: string;
  true_label?: string;
  severity?: number;
  reference_explanation?: string;
}

export interface AnalyzeRequest {
  prompt: string;
  response: string;
  save_incident: boolean;
}

export interface AnalyzeResponse {
  incident_id: string;
  predicted_label: string;
  confidence: number;
  generated_explanation: string;
  retrieved_incidents: RetrievedIncident[];
  similarities: number[];
}

export const analyzeIncident = async (data: AnalyzeRequest) => {
  const response = await api.post<AnalyzeResponse>("/analyze", data);
  return response.data;
};

export const getIncidents = async () => {
  const response = await api.get<Incident[]>("/incidents");
  return response.data;
};

export const addIncident = async (data: Partial<Incident>) => {
  const response = await api.post<Incident>("/incidents", data);
  return response.data;
};
