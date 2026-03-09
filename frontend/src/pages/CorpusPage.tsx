import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import type { Incident } from "../types";
import { Spinner, ErrorAlert, Badge } from "../components/ui";
import { FileText, Calendar, AlertTriangle } from "lucide-react";

export default function CorpusPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <h1 className="text-3xl font-bold text-slate-800">Incident Corpus</h1>
        <p className="text-slate-500 mt-1">
          Browse and filter historical incidents used for RAG.
        </p>
      </header>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <Spinner />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">ID / Date</th>
                  <th className="px-6 py-3 font-semibold">Label Status</th>
                  <th className="px-6 py-3 font-semibold">Prompt Snippet</th>
                  <th className="px-6 py-3 font-semibold">Severity</th>
                  <th className="px-6 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {incidents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      No incidents found in the corpus. Add some via the API.
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc) => (
                    <tr
                      key={inc.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-slate-400" />
                          <span className="font-mono text-slate-700">
                            {inc.id.split("-")[0]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                          <Calendar size={12} />
                          {new Date(inc.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {inc.true_label ? (
                          <Badge label={inc.true_label} type={inc.true_label} />
                        ) : (
                          <span className="text-slate-400 italic text-xs border border-slate-200 rounded px-2 py-0.5">
                            Unlabelled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="truncate text-slate-700 font-mono text-xs">
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
                          <span>
                            {inc.severity ? inc.severity.toFixed(2) : "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-blue-600 hover:text-blue-800 font-medium">
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
    </div>
  );
}
