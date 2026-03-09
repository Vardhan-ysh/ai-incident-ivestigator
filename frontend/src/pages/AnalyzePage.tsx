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
    // If navigated from Sandbox with state, pre-fill the inputs
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
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
          Analyze Incident
        </h1>
        <p className="text-slate-500 mt-1">
          Submit a prompt and response pair for forensic analysis.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleAnalyze} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                User Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none resize-none font-mono text-sm"
                placeholder="Enter the prompt that was sent to the model..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Model Response
              </label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="w-full h-48 p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none resize-none font-mono text-sm"
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
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <label
                htmlFor="save_incident"
                className="text-sm text-slate-700 cursor-pointer"
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-800">
              Analysis Results
            </h2>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Spinner />
                <p className="mt-4 text-sm animate-pulse">
                  Running retrieval-augmented analysis...
                </p>
              </div>
            ) : !result ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                <p>Submit an incident to view forensic analysis.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Prediction Header */}
                <div className="flex items-start justify-between bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">
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
                    <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">
                      Confidence
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="text-xl font-bold text-slate-800">
                        {(result.confidence * 100).toFixed(1)}%
                      </div>
                      <div className="w-20 bg-slate-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${result.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    Forensic Explanation
                  </h3>
                  <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 text-slate-700 leading-relaxed text-sm">
                    {result.generated_explanation}
                  </div>
                </div>

                {/* Retrieved Analogies */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Retrieved Historical Analogies
                  </h3>
                  {result.retrieved_incidents.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">
                      No similar incidents found in corpus.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {result.retrieved_incidents.map((inc) => (
                        <div
                          key={inc.id}
                          className="border border-slate-200 rounded-md p-3 text-sm hover:border-blue-300 transition-colors"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-mono text-xs text-slate-500 truncate w-32">
                              ID: {inc.id.split("-")[0]}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-500">
                                Sim: {(inc.similarity * 100).toFixed(0)}%
                              </span>
                              <Badge
                                label={inc.true_label || "unknown"}
                                type={inc.true_label || "unknown"}
                              />
                            </div>
                          </div>
                          <div className="mb-1">
                            <span className="font-semibold text-slate-600 text-xs uppercase">
                              Prompt:{" "}
                            </span>
                            <span className="text-slate-800 line-clamp-1">
                              {inc.prompt_snippet}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-600 text-xs uppercase">
                              Response:{" "}
                            </span>
                            <span className="text-slate-800 line-clamp-2">
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
