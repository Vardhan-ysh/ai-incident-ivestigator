import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { apiClient } from "../api/client";
import type { AnalyzeRequest, AnalyzeResponse } from "../types";
import { Spinner, ErrorAlert, Badge } from "../components/ui";

export default function AnalyzePage() {
  const location = useLocation();
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [saveIncident, setSaveIncident] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  useEffect(() => {
    if (location.state?.prompt && location.state?.response) {
      setPrompt(location.state.prompt);
      setResponse(location.state.response);
    }
  }, [location.state]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !response.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: AnalyzeRequest = {
        prompt,
        response,
        save_incident: saveIncident,
      };
      const res = await apiClient.post<AnalyzeResponse>("/analyze", payload);
      setResult(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to analyze incident",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
          Analyze Incident
        </h1>
        <p className="text-neutral-400 mt-1">
          Submit a prompt and response pair for forensic analysis.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
          <form onSubmit={handleAnalyze} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-neutral-300 mb-1">
                User Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 p-3 border border-neutral-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none resize-none font-mono text-sm bg-neutral-800 text-neutral-100 placeholder-neutral-500"
                placeholder="Enter the prompt that was sent to the model..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-300 mb-1">
                Model Response
              </label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="w-full h-48 p-3 border border-neutral-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none resize-none font-mono text-sm bg-neutral-800 text-neutral-100 placeholder-neutral-500"
                placeholder="Enter the exact response returned by the model..."
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="save_incident"
                checked={saveIncident}
                onChange={(e) => setSaveIncident(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-neutral-600 focus:ring-blue-500 bg-neutral-700"
              />
              <label
                htmlFor="save_incident"
                className="text-sm text-neutral-400 cursor-pointer"
              >
                Save to incident corpus (unlabelled)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !prompt || !response}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? "Analyzing..." : "Run Forensic Analysis"}
            </button>
          </form>
          {error && <ErrorAlert message={error} />}
        </div>

        {/* Results Panel */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 flex flex-col overflow-hidden">
          <div className="bg-neutral-800/60 border-b border-neutral-800 px-6 py-4">
            <h2 className="text-lg font-semibold text-neutral-200">
              Analysis Results
            </h2>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                <Spinner />
                <p className="mt-4 text-sm animate-pulse">
                  Running retrieval-augmented analysis...
                </p>
              </div>
            ) : !result ? (
              <div className="h-full flex items-center justify-center text-neutral-500">
                <p>Submit an incident to view forensic analysis.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* v2: Triggered Signals (Deterministic Layer) */}
                {result.detection_signals && result.detection_signals.length > 0 && (
                  <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-4">
                    <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      Triggered Safety Signals
                    </h3>
                    <div className="space-y-2">
                      {result.detection_signals.map((sig, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-red-200/80">
                          <code className="text-red-400 font-bold whitespace-nowrap">[{sig.label}]</code>
                          <span>{sig.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prediction Header */}
                <div className="flex items-start justify-between bg-neutral-800 p-4 rounded-lg border border-neutral-700">
                  <div>
                    <p className="text-xs text-neutral-500 uppercase font-semibold tracking-wider mb-1">
                      Predicted Label
                    </p>
                    <Badge
                      label={result.predicted_label
                        .replace("_", " ")
                        .toUpperCase()}
                      type={result.predicted_label}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 uppercase font-semibold tracking-wider mb-1">
                      Evidence Strength
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="text-xl font-bold text-neutral-100">
                        {(result.confidence * 100).toFixed(1)}%
                      </div>
                      <div className="w-24 bg-neutral-700 rounded-full h-2.5 mt-1 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            result.confidence > 0.8 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : 
                            result.confidence > 0.5 ? "bg-blue-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${result.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <h3 className="text-sm font-semibold text-neutral-400 mb-2">
                    Forensic Explanation
                  </h3>
                  <div className="p-4 bg-blue-950/30 rounded-lg border border-blue-900/40 text-neutral-300 leading-relaxed text-sm">
                    {result.generated_explanation}
                  </div>
                </div>

                {/* Retrieved Analogies */}
                <div>
                  <h3 className="text-sm font-semibold text-neutral-400 mb-3">
                    Retrieved Historical Analogies
                  </h3>
                  {result.retrieved_incidents.length === 0 ? (
                    <p className="text-sm text-neutral-500 italic">
                      No similar incidents found in corpus.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {result.retrieved_incidents.map((inc) => (
                        <div
                          key={inc.id}
                          className="border border-neutral-800 rounded-md p-3 text-sm hover:border-blue-800 transition-colors bg-neutral-800/40"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-mono text-xs text-neutral-500 truncate w-32">
                              ID: {inc.id.split("-")[0]}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-neutral-500">
                                Sim: {(inc.similarity * 100).toFixed(0)}%
                              </span>
                              <Badge
                                label={inc.true_label || "unknown"}
                                type={inc.true_label || "unknown"}
                              />
                            </div>
                          </div>
                          <div className="mb-1">
                            <span className="font-semibold text-neutral-500 text-xs uppercase">
                              Prompt:{" "}
                            </span>
                            <span className="text-neutral-300 line-clamp-1">
                              {inc.prompt_snippet}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-neutral-500 text-xs uppercase">
                              Response:{" "}
                            </span>
                            <span className="text-neutral-300 line-clamp-2">
                              {inc.response_snippet}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
