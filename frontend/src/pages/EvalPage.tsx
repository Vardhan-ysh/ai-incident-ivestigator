import { useState } from "react";
import { apiClient } from "../api/client";
import type { EvaluationResponse } from "../types";
import { Spinner, ErrorAlert } from "../components/ui";
import { CheckCircle, AlertTriangle } from "lucide-react";

export default function EvalPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluationResponse | null>(null);

  // Paper success criteria (Section III.F)
  const SUCCESS = {
    precision: 0.85,
    rouge_l: 0.70,
    ece: 0.10,
  };

  const runEvaluation = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const incidentsRes = await apiClient.get("/incidents?limit=1000");
      // Evaluate on TEST split first; fall back to any labeled incidents
      let labeledIds = incidentsRes.data
        .filter((inc: any) => inc.true_label !== null && inc.split === "test")
        .map((inc: any) => inc.id);

      if (labeledIds.length === 0) {
        labeledIds = incidentsRes.data
          .filter((inc: any) => inc.true_label !== null)
          .map((inc: any) => inc.id);
      }

      if (labeledIds.length === 0) {
        throw new Error("No labeled incidents found in the corpus to evaluate against.");
      }

      const res = await apiClient.post<EvaluationResponse>("/evaluate", {
        incident_ids: labeledIds,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to run evaluation");
    } finally {
      setLoading(false);
    }
  };

  function MetricCard({
    label,
    value,
    display,
    threshold,
    lowerIsBetter = false,
    color,
  }: {
    label: string;
    value: number;
    display: string;
    threshold?: number;
    lowerIsBetter?: boolean;
    color: string;
  }) {
    const passes =
      threshold === undefined
        ? null
        : lowerIsBetter
        ? value <= threshold
        : value >= threshold;

    return (
      <div className={`p-4 rounded-lg border ${color} shrink-0`}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs uppercase font-semibold tracking-wide opacity-80">{label}</p>
          {passes !== null &&
            (passes ? (
              <CheckCircle size={14} className="text-emerald-400" />
            ) : (
              <AlertTriangle size={14} className="text-amber-400" />
            ))}
        </div>
        <p className="text-2xl font-bold tracking-tight">{display}</p>
        {threshold !== undefined && (
          <p className="text-xs mt-1 opacity-60">
            Target: {lowerIsBetter ? "≤" : "≥"} {lowerIsBetter ? threshold.toFixed(2) : (threshold * 100).toFixed(0) + "%"}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-neutral-100">Evaluation Dashboard</h1>
            <p className="text-neutral-400 mt-1">
              Paper §V metrics — Precision, Macro F1, ROUGE-L, ECE, Grounding Ratio.
            </p>
          </div>
          <button
            onClick={runEvaluation}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? "Evaluating..." : "Run Pipeline Evaluation"}
          </button>
        </div>
      </header>

      {error && <ErrorAlert message={error} />}

      {loading && (
        <div className="flex flex-col items-center justify-center p-12 bg-neutral-900 rounded-xl border border-neutral-800">
          <Spinner />
          <p className="mt-4 text-neutral-400 font-medium animate-pulse">
            Running full RAG pipeline over incident corpus…
          </p>
          <p className="mt-1 text-xs text-neutral-600">This calls the LLM for every incident — may take a few minutes.</p>
        </div>
      )}

      {!loading && result && (
        <div className="space-y-6">
          {/* ── Overall metrics grid ── */}
          <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">
              Overall Performance · {result.total_evaluated} incidents evaluated
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricCard
                label="Accuracy"
                value={result.accuracy}
                display={`${(result.accuracy * 100).toFixed(1)}%`}
                color="bg-emerald-950/50 border-emerald-800/50 text-emerald-300"
              />
              <MetricCard
                label="Macro F1"
                value={result.macro_f1}
                display={result.macro_f1.toFixed(3)}
                color="bg-blue-950/50 border-blue-800/50 text-blue-300"
              />
              <MetricCard
                label="ECE (Calibration)"
                value={result.expected_calibration_error}
                display={result.expected_calibration_error.toFixed(3)}
                threshold={SUCCESS.ece}
                lowerIsBetter
                color="bg-purple-950/50 border-purple-800/50 text-purple-300"
              />
              <MetricCard
                label="ROUGE-L"
                value={result.rouge_l}
                display={result.rouge_l.toFixed(3)}
                threshold={SUCCESS.rouge_l}
                color="bg-amber-950/50 border-amber-800/50 text-amber-300"
              />
              <MetricCard
                label="Grounding Ratio"
                value={result.grounding_ratio}
                display={`${(result.grounding_ratio * 100).toFixed(0)}%`}
                color="bg-teal-950/50 border-teal-800/50 text-teal-300"
              />
              <MetricCard
                label="Incidents"
                value={result.total_evaluated}
                display={String(result.total_evaluated)}
                color="bg-neutral-800 border-neutral-700 text-neutral-300"
              />
            </div>
          </div>

          {/* ── Per-class table ── */}
          <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 overflow-x-auto">
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">
              Per-Class Metrics (Paper Table V)
            </h3>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-neutral-500 uppercase bg-neutral-800/60">
                <tr>
                  <th className="px-4 py-2 rounded-l">Class</th>
                  <th className="px-4 py-2">Precision</th>
                  <th className="px-4 py-2">Recall</th>
                  <th className="px-4 py-2">F1 Score</th>
                  <th className="px-4 py-2 rounded-r">Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {Object.entries(result.per_class_metrics).map(([key, metrics]: [string, any]) => {
                  if (key === "accuracy" || key === "macro avg" || key === "weighted avg") return null;
                  return (
                    <tr key={key} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-neutral-300">{key}</td>
                      <td className="px-4 py-3 text-neutral-400">{metrics.precision?.toFixed(3)}</td>
                      <td className="px-4 py-3 text-neutral-400">{metrics.recall?.toFixed(3)}</td>
                      <td className="px-4 py-3 text-neutral-200 font-semibold">{metrics["f1-score"]?.toFixed(3)}</td>
                      <td className="px-4 py-3 text-neutral-500">{metrics.support}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Paper success criteria checklist ── */}
          <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">
              Paper §III.F Success Criteria
            </h3>
            <div className="space-y-2 text-sm">
              {[
                {
                  label: "Precision ≥ 0.85 (constraint C3)",
                  ok: (result.per_class_metrics["macro avg"]?.precision ?? 0) >= SUCCESS.precision,
                  value: `${((result.per_class_metrics["macro avg"]?.precision ?? 0) * 100).toFixed(1)}%`,
                },
                {
                  label: "ROUGE-L ≥ 0.70 (explanation quality)",
                  ok: result.rouge_l >= SUCCESS.rouge_l,
                  value: result.rouge_l.toFixed(3),
                },
                {
                  label: "ECE ≤ 0.10 (calibration)",
                  ok: result.expected_calibration_error <= SUCCESS.ece,
                  value: result.expected_calibration_error.toFixed(3),
                },
                {
                  label: "Grounding ratio — explanations cite retrieved cases (C2)",
                  ok: result.grounding_ratio >= 0.75,
                  value: `${(result.grounding_ratio * 100).toFixed(0)}%`,
                },
              ].map(({ label, ok, value }) => (
                <div
                  key={label}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${
                    ok
                      ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-300"
                      : "bg-amber-950/30 border-amber-900/50 text-amber-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                    <span>{label}</span>
                  </div>
                  <span className="font-mono text-xs">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && !result && !error && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
          <p className="text-neutral-400 font-medium">
            Click <strong className="text-neutral-200">"Run Pipeline Evaluation"</strong> to assess metrics across the labeled incident corpus.
          </p>
          <p className="text-xs text-neutral-600 mt-2">
            Runs the full 4-stage RAG pipeline on every test-split incident and computes precision/recall/F1, ROUGE-L, ECE, and grounding ratio.
          </p>
        </div>
      )}
    </div>
  );
}
