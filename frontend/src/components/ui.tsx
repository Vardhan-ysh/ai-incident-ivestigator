export function Spinner() {
  return (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );
}

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="bg-red-950/50 border-l-4 border-red-500 p-4 rounded-md my-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-300">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function Badge({ label, type }: { label: string; type?: string }) {
  const colors: Record<string, string> = {
    hallucination: "bg-orange-950/60 text-orange-300 border-orange-800/50",
    bias: "bg-purple-950/60 text-purple-300 border-purple-800/50",
    policy_violation: "bg-red-950/60 text-red-300 border-red-800/50",
    safe: "bg-green-950/60 text-green-300 border-green-800/50",
    unknown: "bg-neutral-800 text-neutral-300 border-neutral-700",
  };

  const colorClass = type && colors[type] ? colors[type] : colors.unknown;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}
    >
      {label}
    </span>
  );
}
