import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import type { Incident } from "../types";
import { Spinner, ErrorAlert, Badge } from "../components/ui";
import { FileText, Calendar, AlertTriangle, X, Tag, Activity } from "lucide-react";

export default function CorpusPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Incident | null>(null);

  useEffect(() => {
    async function fetchIncidents() {
      try {
        const res = await apiClient.get<Incident[]>("/incidents?limit=50");
        setIncidents(res.data);
      } catch (err: any) {
        setError(err.message || "Failed to load corpus");
      } finally {
        setLoading(false);
      }
    }
    fetchIncidents();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-100">Incident Corpus</h1>
        <p className="text-neutral-400 mt-1">
          Browse and filter historical incidents used for RAG.
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
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-neutral-500"
                    >
                      No incidents found in the corpus. Add some via the API.
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc) => (
                    <tr
                      key={inc.id}
                      className="hover:bg-neutral-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-neutral-500" />
                          <span className="font-mono text-neutral-300">
                            {inc.id.split("-")[0]}
                          </span>
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
                          <span className="text-neutral-500 italic text-xs border border-neutral-700 rounded px-2 py-0.5">
                            Unlabelled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="truncate text-neutral-400 font-mono text-xs">
                          {inc.prompt}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <AlertTriangle
                            size={14}
                            className={
                              inc.severity && inc.severity > 0.6
                                ? "text-amber-500"
                                : "text-green-500"
                            }
                          />
                          <span className="text-neutral-300">
                            {inc.severity ? inc.severity.toFixed(2) : "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelected(inc)}
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
                <h2 className="text-lg font-semibold text-neutral-100">
                  Incident Details
                </h2>
                <p className="text-xs font-mono text-neutral-500 mt-0.5">
                  {selected.id}
                </p>
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
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
