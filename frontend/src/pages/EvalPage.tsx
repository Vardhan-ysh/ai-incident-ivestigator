import { useState } from "react";
import { apiClient } from "../api/client";
import type { EvaluationResponse } from "../types";
import { Spinner, ErrorAlert } from "../components/ui";

export default function EvalPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluationResponse | null>(null);

  const runEvaluation = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // First fetch all labeled incidents to evaluate on
      const incidentsRes = await apiClient.get("/incidents?limit=1000");
      const labeledIds = incidentsRes.data
        .filter((inc: any) => inc.true_label !== null)
        .map((inc: any) => inc.id);

      if (labeledIds.length === 0) {
        throw new Error(
          "No labeled incidents found in the corpus to evaluate against.",
        );
      }

      const res = await apiClient.post<EvaluationResponse>("/evaluate", {
        incident_ids: labeledIds,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || "Failed to run evaluation",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              System Evaluation
            </h1>
            <p className="text-slate-500 mt-1">
              Run continuous metrics against the held-out labeled dataset.
            </p>
          </div>
          <button
            onClick={runEvaluation}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? "Evaluating Pipeline..." : "Run Pipeline Evaluation"}
          </button>
        </div>
      </header>

      {error && <ErrorAlert message={error} />}

      {loading && (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Spinner />
          <p className="mt-4 text-slate-500 font-medium animate-pulse">
            Running full RAG pipeline over incident corpus...
          </p>
        </div>
      )}

      {!loading && result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm col-span-1 md:col-span-2">
            <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b border-slate-100 pb-2">
              Overall Performance
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 shrink-0">
                <p className="text-sm text-slate-500 uppercase font-semibold">
                  Evaluated
                </p>
                <p className="text-2xl font-bold text-slate-800 tracking-tight">
                  {result.total_evaluated}
                </p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 shrink-0">
                <p className="text-sm text-emerald-600 uppercase font-semibold">
                  Accuracy
                </p>
                <p className="text-2xl font-bold text-emerald-700 tracking-tight">
                  {(result.accuracy * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shrink-0">
                <p className="text-sm text-blue-600 uppercase font-semibold">
                  Macro F1
                </p>
                <p className="text-2xl font-bold text-blue-700 tracking-tight">
                  {result.macro_f1.toFixed(3)}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 shrink-0">
                <p className="text-sm text-purple-600 uppercase font-semibold">
                  Calib. Error (ECE)
                </p>
                <p className="text-2xl font-bold text-purple-700 tracking-tight">
                  {result.expected_calibration_error.toFixed(3)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm col-span-1 md:col-span-2 overflow-x-auto">
            <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b border-slate-100 pb-2">
              Per-Class Metrics
            </h3>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-2">Class</th>
                  <th className="px-4 py-2">Precision</th>
                  <th className="px-4 py-2">Recall</th>
                  <th className="px-4 py-2">F1 Score</th>
                  <th className="px-4 py-2">Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(result.per_class_metrics).map(
                  ([key, metrics]: [string, any]) => {
                    if (
                      key === "accuracy" ||
                      key === "macro avg" ||
                      key === "weighted avg"
                    )
                      return null;
                    return (
                      <tr key={key}>
                        <td className="px-4 py-3 font-medium text-slate-700 font-mono text-xs">
                          {key}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {metrics.precision.toFixed(3)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {metrics.recall.toFixed(3)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-semibold">
                          {metrics["f1-score"]?.toFixed(3)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {metrics.support}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !result && !error && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
          <p className="text-slate-500 font-medium">
            Click "Run Pipeline Evaluation" to assess standard metrics across
            the labeled codebase.
          </p>
        </div>
      )}
    </div>
  );
}
