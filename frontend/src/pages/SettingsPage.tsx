export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-800">
          Settings & Configuration
        </h1>
        <p className="text-slate-500 mt-1">
          Manage system configurations and environment integrations.
        </p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-slate-700 mb-4 border-b border-slate-100 pb-2">
              Models & APIs
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Embedding Model
                </label>
                <input
                  type="text"
                  disabled
                  value="text-embedding-3-small"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Reasoning LLM (Classification & Generation)
                </label>
                <input
                  type="text"
                  disabled
                  value="gpt-4o"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-500 text-sm"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-700 mb-4 border-b border-slate-100 pb-2">
              Retrieval Hyperparameters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  k (Top Neighbors)
                </label>
                <input
                  type="text"
                  disabled
                  value="5"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Alpha (Calibration)
                </label>
                <input
                  type="text"
                  disabled
                  value="2.5"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Beta (Calibration)
                </label>
                <input
                  type="text"
                  disabled
                  value="-1.25"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-500 text-sm"
                />
              </div>
            </div>
          </section>

          <section className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="flex gap-3">
              <div className="text-blue-600 mt-0.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-sm text-blue-800">
                Changes to these configurations currently require restarting the
                backend server via{" "}
                <code className="bg-blue-100 px-1 rounded">.env</code> edits.
                Dynamic updates will be supported in a future version.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
