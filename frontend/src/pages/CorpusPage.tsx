import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import type { Incident, IncidentType } from "../types";
import { Spinner, ErrorAlert, Badge } from "../components/ui";
import {
  FileText, Calendar, AlertTriangle, X, Tag, Activity, CheckCircle, Pencil
} from "lucide-react";

const LABELS: IncidentType[] = ["hallucination", "bias", "policy_violation", "safe"];

export default function CorpusPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Incident | null>(null);

  // Labeling form state
  const [labelDraft, setLabelDraft] = useState<IncidentType | "">("");
  const [severityDraft, setSeverityDraft] = useState<number>(0.5);
  const [explanationDraft, setExplanationDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [aiSuggestedLabel, setAiSuggestedLabel] = useState<IncidentType | null>(null);

  useEffect(() => {
    fetchIncidents();
  }, []);

  async function fetchIncidents() {
    try {
      const res = await apiClient.get<Incident[]>("/incidents?limit=200");
      setIncidents(res.data);
    } catch (err: any) {
      setError(err.message || "Failed to load corpus");
    } finally {
      setLoading(false);
    }
  }

  async function openDrawer(inc: Incident) {
    setSelected(inc);
    setSaveSuccess(false);
    setAiSuggestedLabel(null);

    // Start with existing human label (or blank)
    setLabelDraft((inc.true_label as IncidentType | null) ?? "");
    setSeverityDraft(inc.severity ?? 0.5);
    setExplanationDraft(inc.reference_explanation ?? "");

    // Fetch detail to get ForensicAnalysis predicted_label for pre-population
    try {
      const detail = await apiClient.get<any>(`/incidents/${inc.id}`);
      const analyses: any[] = detail.data.analyses ?? [];
      if (analyses.length > 0) {
        // Most recent analysis first (API returns newest first via desc order)
        const latest = analyses[analyses.length - 1];
        const predicted = latest.predicted_label as IncidentType;
        setAiSuggestedLabel(predicted);
        
        // Add detection signals to selected if they exist (for UI display)
        if (latest.detection_signals) {
          (selected as any).detection_signals = latest.detection_signals;
        }

        // Pre-fill only if not already human-labelled
        if (!inc.true_label) {
          setLabelDraft(predicted);
        }
      }
    } catch {
      // Non-fatal — drawer still opens
    }
  }

  async function handleSaveLabel() {
    if (!selected) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const payload: Record<string, any> = {};
      if (labelDraft) payload.true_label = labelDraft;
      payload.severity = severityDraft;
      if (explanationDraft.trim()) payload.reference_explanation = explanationDraft.trim();

      const res = await apiClient.patch<Incident>(`/incidents/${selected.id}`, payload);

      // Update local state
      setIncidents((prev) => prev.map((i) => (i.id === selected.id ? res.data : i)));
      setSelected(res.data);
      setSaveSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to save label");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-100">Incident Corpus</h1>
        <p className="text-neutral-400 mt-1">
          Browse historical incidents. Click <strong className="text-neutral-300">View Details</strong> to human-verify any unlabelled incident.
        </p>
      </header>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <Spinner />
      ) : (
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-neutral-500 uppercase bg-neutral-800/60 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-3 font-semibold">ID / Date</th>
                  <th className="px-6 py-3 font-semibold">Label Status</th>
                  <th className="px-6 py-3 font-semibold">Prompt Snippet</th>
                  <th className="px-6 py-3 font-semibold">Severity</th>
                  <th className="px-6 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                      No incidents found in the corpus.
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-neutral-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-neutral-500" />
                          <span className="font-mono text-neutral-300">{inc.id.split("-")[0]}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
                          <Calendar size={12} />
                          {new Date(inc.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {inc.true_label ? (
                          <Badge label={inc.true_label} type={inc.true_label} />
                        ) : (
                          <span className="text-neutral-500 italic text-xs border border-neutral-700 rounded px-2 py-0.5 flex items-center gap-1 w-fit">
                            <Pencil size={10} /> Unlabelled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="truncate text-neutral-400 font-mono text-xs">{inc.prompt}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <AlertTriangle
                            size={14}
                            className={inc.severity && inc.severity > 0.6 ? "text-amber-500" : "text-green-500"}
                          />
                          <span className="text-neutral-300">
                            {inc.severity ? inc.severity.toFixed(2) : "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openDrawer(inc)}
                          className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Detail Drawer ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          {/* Panel */}
          <div className="relative w-full max-w-2xl bg-neutral-900 shadow-2xl overflow-y-auto flex flex-col border-l border-neutral-800">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-800/50">
              <div>
                <h2 className="text-lg font-semibold text-neutral-100">Incident Details</h2>
                <p className="text-xs font-mono text-neutral-500 mt-0.5">{selected.id}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1 rounded-lg hover:bg-neutral-700 text-neutral-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-4 px-6 py-3 border-b border-neutral-800 text-sm">
              {selected.true_label && (
                <div className="flex items-center gap-1.5">
                  <Tag size={13} className="text-neutral-500" />
                  <Badge label={selected.true_label} type={selected.true_label} />
                </div>
              )}
              {selected.severity != null && (
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <Activity size={13} />
                  <span>Severity: <strong className="text-neutral-200">{selected.severity.toFixed(2)}</strong></span>
                </div>
              )}
              {selected.split && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-neutral-700 text-neutral-400">
                  {selected.split}
                </span>
              )}
              <span className="text-xs text-neutral-500 ml-auto">
                {new Date(selected.created_at).toLocaleString()}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 px-6 py-5 space-y-6">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                  User Prompt
                </h3>
                <div className="bg-neutral-800 rounded-lg p-4 text-sm text-neutral-300 border border-neutral-700 whitespace-pre-wrap leading-relaxed">
                  {selected.prompt}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                  Model Response
                </h3>
                <div className="bg-neutral-800 rounded-lg p-4 text-sm text-neutral-300 border border-neutral-700 whitespace-pre-wrap leading-relaxed">
                  {selected.response}
                </div>
              </section>

              {selected.reference_explanation && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                    Reference Explanation
                  </h3>
                  <div className="bg-amber-950/30 rounded-lg p-4 text-sm text-amber-300 border border-amber-900/40 leading-relaxed">
                    {selected.reference_explanation}
                  </div>
                </section>
              )}

              {/* v2: Triggered Signals display in Drawer */}
              {(selected as any).detection_signals && (selected as any).detection_signals.length > 0 && (
                <section className="bg-red-950/20 border border-red-900/30 rounded-lg p-4">
                  <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    Triggered Safety Signals
                  </h3>
                  <div className="space-y-1">
                    {(selected as any).detection_signals.map((sig: any, i: number) => (
                      <div key={i} className="text-xs text-red-200/80">
                        <span className="font-bold text-red-400">[{sig.label}]</span> {sig.reason}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Human Verification Panel ── */}
              <section className="border border-neutral-700 rounded-xl p-5 space-y-4 bg-neutral-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <Pencil size={14} className="text-blue-400" />
                  <h3 className="text-sm font-semibold text-neutral-200">Human Verification</h3>
                  {saveSuccess && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle size={12} /> Saved
                    </span>
                  )}
                </div>

                {/* Label picker */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wide">
                    Verified Label
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LABELS.map((lbl) => {
                      const isSuggested = aiSuggestedLabel === lbl;
                      return (
                        <button
                          key={lbl}
                          onClick={() => setLabelDraft(lbl)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                            labelDraft === lbl
                              ? lbl === "hallucination"
                                ? "bg-orange-600 border-orange-500 text-white shadow-sm"
                                : lbl === "bias"
                                ? "bg-purple-600 border-purple-500 text-white shadow-sm"
                                : lbl === "policy_violation"
                                ? "bg-red-600 border-red-500 text-white shadow-sm"
                                : "bg-green-600 border-green-500 text-white shadow-sm"
                              : isSuggested
                              ? "bg-blue-950/30 border-blue-500/50 text-blue-300 hover:border-blue-400"
                              : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500"
                          }`}
                        >
                          {lbl.replace("_", " ")}
                          {isSuggested && (
                            <span className="flex items-center gap-1 px-1 py-0.5 rounded bg-blue-500/20 text-[10px] font-bold uppercase tracking-tight text-blue-300 border border-blue-500/30">
                              Suggested
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {labelDraft && (
                      <button
                        onClick={() => setLabelDraft("")}
                        className="px-3 py-1.5 rounded-full text-xs border border-neutral-700 text-neutral-500 hover:text-neutral-300"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Severity slider */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wide">
                    Severity — <span className="text-neutral-200">{severityDraft.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={severityDraft}
                    onChange={(e) => setSeverityDraft(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-neutral-600 mt-0.5">
                    <span>0.0 (Low)</span><span>1.0 (Critical)</span>
                  </div>
                </div>

                {/* Reference explanation */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wide">
                    Reference Explanation (optional)
                  </label>
                  <textarea
                    value={explanationDraft}
                    onChange={(e) => setExplanationDraft(e.target.value)}
                    rows={4}
                    placeholder="Describe why this is a hallucination / bias / policy violation…"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-200 placeholder-neutral-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>

                <button
                  onClick={handleSaveLabel}
                  disabled={saving || !labelDraft}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {saving ? "Saving…" : "Save Verified Label"}
                </button>
                {!labelDraft && (
                  <p className="text-xs text-neutral-500 text-center -mt-1">Select a label to enable saving</p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
