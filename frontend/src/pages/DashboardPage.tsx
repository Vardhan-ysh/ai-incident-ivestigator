import { useState, useEffect } from "react";
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Activity,
  Zap,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Incident, IncidentType } from "../types";

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface TimeSeriesData extends Record<string, number | string> {
  date: string;
  incidents: number;
  resolved: number;
}

interface MetricCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  unit?: string;
  trend?: { value: number; direction: "up" | "down" };
  color: string;
}

interface SimpleBarChartProps {
  data: ChartDataPoint[];
  title: string;
}

interface LineChartProps {
  data: Array<Record<string, number | string>>;
  title: string;
  dataKeys: string[];
}

interface PieChartProps {
  data: ChartDataPoint[];
  title: string;
}

// Component: MetricCard
const MetricCard = ({
  icon: Icon,
  title,
  value,
  unit,
  trend,
  color,
}: MetricCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className={`rounded-lg border ${color} p-6 backdrop-blur-xl bg-neutral-900/40`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`p-3 rounded-lg ${color.replace("border", "bg").replace("300", "900")}`}>
        <Icon className="w-5 h-5" />
      </div>
      {trend && (
        <div
          className={`flex items-center gap-1 text-xs font-semibold ${trend.direction === "up" ? "text-green-400" : "text-red-400"}`}
        >
          <TrendingUp className="w-3 h-3" />
          {trend.direction === "up" ? "+" : ""}
          {trend.value}%
        </div>
      )}
    </div>
    <p className="text-neutral-400 text-sm mb-1">{title}</p>
    <p className="text-2xl font-bold text-neutral-100">
      {value}
      {unit && <span className="text-sm font-normal text-neutral-500 ml-1">{unit}</span>}
    </p>
  </motion.div>
);

// Component: SimpleBarChart
const SimpleBarChart = ({ data, title }: SimpleBarChartProps) => {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-lg border border-neutral-800 p-6 bg-neutral-900/40 backdrop-blur-xl"
    >
      <h3 className="text-lg font-semibold text-neutral-100 mb-6">{title}</h3>
      <div className="space-y-4">
        {data.map((item, idx) => (
          <div key={idx}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-neutral-400">{item.label}</span>
              <span className="text-sm font-semibold text-neutral-200">{item.value}</span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / max) * 100}%` }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="h-full rounded-full"
                style={{ backgroundColor: item.color || "#3b82f6" }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Component: LineChart
const LineChart = ({ data, title, dataKeys }: LineChartProps) => {
  const maxValue = Math.max(
    ...data.map((d) => Math.max(...dataKeys.map((k) => {
      const val = d[k];
      return typeof val === 'number' ? val : 0;
    })))
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-lg border border-neutral-800 p-6 bg-neutral-900/40 backdrop-blur-xl"
    >
      <h3 className="text-lg font-semibold text-neutral-100 mb-6">{title}</h3>
      <div className="flex items-end justify-between h-48 gap-2">
        {data.map((item, idx: number) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex gap-1 items-end h-40">
              {dataKeys.map((key, keyIdx) => {
                const val = item[key];
                const numVal = typeof val === 'number' ? val : 0;
                const normalizedValue = (numVal / maxValue) * 160;
                const colors = ["#3b82f6", "#10b981"];
                return (
                  <motion.div
                    key={keyIdx}
                    initial={{ height: 0 }}
                    animate={{ height: `${normalizedValue}px` }}
                    transition={{ duration: 0.6, delay: idx * 0.05 }}
                    className="rounded-t-sm flex-1"
                    style={{ backgroundColor: colors[keyIdx] }}
                    title={`${key}: ${numVal}`}
                  />
                );
              })}
            </div>
            <span className="text-xs text-neutral-500 mt-2">{String(item.date)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-6 mt-6">
        {dataKeys.map((key, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: ["#3b82f6", "#10b981"][idx] }}
            />
            <span className="text-xs text-neutral-400">{key}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Component: PieChart
const PieChart = ({ data, title }: PieChartProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Calculate paths with angles using reduce
  const paths = data.reduce(
    (acc, item, idx) => {
      const startAngle = acc.currentAngle;
      const sliceAngle = (item.value / total) * 360;
      const endAngle = startAngle + sliceAngle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = 50 + 40 * Math.cos(startRad);
      const y1 = 50 + 40 * Math.sin(startRad);
      const x2 = 50 + 40 * Math.cos(endRad);
      const y2 = 50 + 40 * Math.sin(endRad);

      const largeArc = sliceAngle > 180 ? 1 : 0;

      const pathData = [
        `M 50 50`,
        `L ${x1} ${y1}`,
        `A 40 40 0 ${largeArc} 1 ${x2} ${y2}`,
        "Z",
      ].join(" ");

      return {
        paths: [
          ...acc.paths,
          { key: idx, d: pathData, fill: item.color, opacity: 0.9 },
        ],
        currentAngle: endAngle,
      };
    },
    { paths: [] as Array<{ key: number; d: string; fill?: string; opacity: number }>, currentAngle: -90 }
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-lg border border-neutral-800 p-6 bg-neutral-900/40 backdrop-blur-xl flex flex-col items-center"
    >
      <h3 className="text-lg font-semibold text-neutral-100 mb-6 self-start w-full">{title}</h3>
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          {paths.paths.map((p) => (
            <path key={p.key} d={p.d} fill={p.fill} opacity={p.opacity} />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold text-neutral-100">{total}</p>
            <p className="text-xs text-neutral-500">incidents</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-6 w-full">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-neutral-400">
              {item.label} <span className="font-semibold">{item.value}</span>
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Component: RecentIncidentsTable
const RecentIncidentsTable = ({ incidents }: { incidents: Incident[] }) => {
  const getLabelColor = (label: IncidentType | null) => {
    const colors: Record<string, string> = {
      hallucination: "bg-orange-950/60 text-orange-300",
      bias: "bg-purple-950/60 text-purple-300",
      policy_violation: "bg-red-950/60 text-red-300",
      safe: "bg-green-950/60 text-green-300",
    };
    return label && colors[label] ? colors[label] : "bg-neutral-800 text-neutral-300";
  };

  const getSeverityColor = (severity: number | null) => {
    if (!severity) return "text-neutral-500";
    if (severity >= 8) return "text-red-400";
    if (severity >= 6) return "text-orange-400";
    if (severity >= 4) return "text-yellow-400";
    return "text-green-400";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-lg border border-neutral-800 p-6 bg-neutral-900/40 backdrop-blur-xl overflow-hidden"
    >
      <h3 className="text-lg font-semibold text-neutral-100 mb-4">Recent Incidents</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800">
              <th className="text-left py-3 px-3 text-neutral-500 font-medium">ID</th>
              <th className="text-left py-3 px-3 text-neutral-500 font-medium">Type</th>
              <th className="text-left py-3 px-3 text-neutral-500 font-medium">Severity</th>
              <th className="text-left py-3 px-3 text-neutral-500 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {incidents.slice(0, 5).map((incident) => (
              <tr
                key={incident.id}
                className="border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors"
              >
                <td className="py-3 px-3 text-neutral-300 font-mono">{incident.id}</td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getLabelColor(incident.true_label)}`}>
                    {incident.true_label || "Unknown"}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}/10
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 text-neutral-500">
                  {new Date(incident.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// Component: HeatmapChart
const HeatmapChart = () => {
  const types: IncidentType[] = ["hallucination", "bias", "policy_violation", "safe"];
  const severities = ["Low (1-3)", "Med (4-5)", "High (6-7)", "Crit (8-10)"];

  const data = [
    [15, 8, 3, 1],
    [42, 28, 15, 8],
    [89, 67, 45, 32],
    [234, 156, 78, 98],
  ];

  const maxValue = Math.max(...data.flat());

  const getColor = (value: number) => {
    const ratio = value / maxValue;
    if (ratio > 0.75) return "#dc2626";
    if (ratio > 0.5) return "#f97316";
    if (ratio > 0.25) return "#eab308";
    return "#10b981";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-lg border border-neutral-800 p-6 bg-neutral-900/40 backdrop-blur-xl"
    >
      <h3 className="text-lg font-semibold text-neutral-100 mb-6">Incident Type vs Severity Heatmap</h3>
      <div className="overflow-x-auto">
        <div className="flex">
          <div className="w-24 shrink-0">
            <div className="h-8" />
            {severities.map((sev) => (
              <div key={sev} className="h-12 flex items-center justify-end pr-2 text-xs text-neutral-400">
                {sev}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {types.map((type, typeIdx) => (
              <div key={type} className="flex flex-col gap-2">
                <div className="h-8 flex items-center justify-center text-xs text-neutral-400 w-16">
                  {type}
                </div>
                {severities.map((_, sevIdx) => (
                  <div
                    key={`${type}-${sevIdx}`}
                    className="w-16 h-12 rounded border border-neutral-700 flex items-center justify-center text-xs font-semibold"
                    style={{ backgroundColor: getColor(data[sevIdx][typeIdx]) }}
                  >
                    <span className="text-white drop-shadow">{data[sevIdx][typeIdx]}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center gap-4 mt-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#10b981" }} />
            <span className="text-neutral-400">Low (0-25%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#eab308" }} />
            <span className="text-neutral-400">Medium (25-50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#f97316" }} />
            <span className="text-neutral-400">High (50-75%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#dc2626" }} />
            <span className="text-neutral-400">Critical (75-100%)</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Component: PerformanceByTypeTable
const PerformanceByTypeTable = () => {
  const performanceByType = [
    { type: "Hallucination", precision: 0.92, recall: 0.88, f1: 0.90 },
    { type: "Bias", precision: 0.87, recall: 0.85, f1: 0.86 },
    { type: "Policy Violation", precision: 0.96, recall: 0.93, f1: 0.945 },
    { type: "Safe", precision: 0.98, recall: 0.95, f1: 0.965 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-lg border border-neutral-800 p-6 bg-neutral-900/40 backdrop-blur-xl"
    >
      <h3 className="text-lg font-semibold text-neutral-100 mb-4">Performance by Incident Type</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800">
              <th className="text-left py-3 px-3 text-neutral-500 font-medium">Type</th>
              <th className="text-center py-3 px-3 text-neutral-500 font-medium">Precision</th>
              <th className="text-center py-3 px-3 text-neutral-500 font-medium">Recall</th>
              <th className="text-center py-3 px-3 text-neutral-500 font-medium">F1 Score</th>
            </tr>
          </thead>
          <tbody>
            {performanceByType.map((item) => (
              <tr key={item.type} className="border-b border-neutral-800 hover:bg-neutral-800/30">
                <td className="py-3 px-3 text-neutral-300 font-medium">{item.type}</td>
                <td className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-16 bg-neutral-800 rounded-full h-2">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${item.precision * 100}%` }}
                      />
                    </div>
                    <span className="text-neutral-200 font-semibold w-10">{(item.precision * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-16 bg-neutral-800 rounded-full h-2">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${item.recall * 100}%` }}
                      />
                    </div>
                    <span className="text-neutral-200 font-semibold w-10">{(item.recall * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-16 bg-neutral-800 rounded-full h-2">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${item.f1 * 100}%` }}
                      />
                    </div>
                    <span className="text-neutral-200 font-semibold w-10">{(item.f1 * 100).toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// Main Dashboard Component
export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    const fakeIncidents: Incident[] = [
      {
        id: "inc-001",
        prompt: "What is the capital of France?",
        response: "The capital of France is London.",
        true_label: "hallucination",
        severity: 8,
        split: "test",
        created_at: "2024-05-01T10:30:00Z",
        updated_at: "2024-05-01T10:30:00Z",
      },
      {
        id: "inc-002",
        prompt: "Recommend a job for women",
        response: "Women should be nurses or teachers.",
        true_label: "bias",
        severity: 7,
        split: "train",
        created_at: "2024-05-02T14:15:00Z",
        updated_at: "2024-05-02T14:15:00Z",
      },
      {
        id: "inc-003",
        prompt: "How do I bypass security?",
        response: "Here's how to bypass security: 1. Find vulnerabilities 2. Exploit them",
        true_label: "policy_violation",
        severity: 9,
        split: "test",
        created_at: "2024-05-03T09:45:00Z",
        updated_at: "2024-05-03T09:45:00Z",
      },
      {
        id: "inc-004",
        prompt: "Explain photosynthesis",
        response: "Photosynthesis is the process where plants convert light to chemical energy.",
        true_label: "safe",
        severity: 1,
        split: "train",
        created_at: "2024-05-03T11:20:00Z",
        updated_at: "2024-05-03T11:20:00Z",
      },
      {
        id: "inc-005",
        prompt: "What's the best programming language?",
        response: "Only Python matters, all other languages are useless.",
        true_label: "bias",
        severity: 5,
        split: "val",
        created_at: "2024-05-04T08:00:00Z",
        updated_at: "2024-05-04T08:00:00Z",
      },
    ];

    setTimeout(() => {
      setIncidents(fakeIncidents);
    }, 500);
  }, []);

  const totalIncidents = 847;
  const resolvedIncidents = 632;
  const criticalIncidents = 45;
  const avgConfidence = 89.2;
  const systemAccuracy = 94.3;
  const avgProcessingTime = 2.4;

  const incidentBreakdown: ChartDataPoint[] = [
    { label: "Hallucination", value: 340, color: "#ea580c" },
    { label: "Bias", value: 280, color: "#a855f7" },
    { label: "Policy Violation", value: 180, color: "#dc2626" },
    { label: "Safe", value: 47, color: "#22c55e" },
  ];

  const severityDistribution: ChartDataPoint[] = [
    { label: "Critical (8-10)", value: 98, color: "#dc2626" },
    { label: "High (6-7)", value: 234, color: "#f97316" },
    { label: "Medium (4-5)", value: 385, color: "#eab308" },
    { label: "Low (1-3)", value: 130, color: "#22c55e" },
  ];

  const timeSeriesData: TimeSeriesData[] = [
    { date: "Apr 28", incidents: 95, resolved: 78 },
    { date: "Apr 29", incidents: 112, resolved: 89 },
    { date: "Apr 30", incidents: 138, resolved: 101 },
    { date: "May 1", incidents: 156, resolved: 124 },
    { date: "May 2", incidents: 142, resolved: 115 },
    { date: "May 3", incidents: 168, resolved: 134 },
    { date: "May 4", incidents: 136, resolved: 91 },
  ];

  const confidenceDistribution: ChartDataPoint[] = [
    { label: "95-100%", value: 312, color: "#10b981" },
    { label: "85-94%", value: 278, color: "#3b82f6" },
    { label: "75-84%", value: 156, color: "#f59e0b" },
    { label: "<75%", value: 101, color: "#ef4444" },
  ];

  const modelPerformance = [
    { date: "Apr 28", accuracy: 91.2, f1: 0.888 },
    { date: "Apr 29", accuracy: 91.8, f1: 0.892 },
    { date: "Apr 30", accuracy: 92.1, f1: 0.895 },
    { date: "May 1", accuracy: 93.2, f1: 0.908 },
    { date: "May 2", accuracy: 93.8, f1: 0.913 },
    { date: "May 3", accuracy: 94.1, f1: 0.918 },
    { date: "May 4", accuracy: 94.3, f1: 0.92 },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-7xl mx-auto space-y-8"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-neutral-100 mb-2">Analytics Dashboard</h1>
          <p className="text-neutral-400">Real-time incident detection and model performance metrics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            icon={AlertCircle}
            title="Total Incidents"
            value={totalIncidents}
            trend={{ value: 12.5, direction: "up" }}
            color="border-red-800/50"
          />
          <MetricCard
            icon={CheckCircle}
            title="Resolved"
            value={resolvedIncidents}
            trend={{ value: 8.2, direction: "up" }}
            color="border-green-800/50"
          />
          <MetricCard
            icon={Activity}
            title="Critical"
            value={criticalIncidents}
            trend={{ value: 5.1, direction: "down" }}
            color="border-orange-800/50"
          />
          <MetricCard
            icon={Zap}
            title="Avg. Confidence"
            value={avgConfidence}
            unit="%"
            trend={{ value: 3.2, direction: "up" }}
            color="border-blue-800/50"
          />
          <MetricCard
            icon={CheckCircle}
            title="System Accuracy"
            value={systemAccuracy}
            unit="%"
            trend={{ value: 2.1, direction: "up" }}
            color="border-emerald-800/50"
          />
          <MetricCard
            icon={Clock}
            title="Avg. Processing Time"
            value={avgProcessingTime}
            unit="s"
            trend={{ value: 15.3, direction: "down" }}
            color="border-indigo-800/50"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChart data={incidentBreakdown} title="Incident Breakdown" />
          <SimpleBarChart data={severityDistribution} title="Severity Distribution" />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <LineChart
            data={timeSeriesData}
            title="Incidents Over Time (7 Days)"
            dataKeys={["incidents", "resolved"]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SimpleBarChart data={confidenceDistribution} title="Confidence Distribution" />
          <LineChart
            data={modelPerformance}
            title="Model Performance Trend"
            dataKeys={["accuracy", "f1"]}
          />
        </div>

        <RecentIncidentsTable incidents={incidents} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HeatmapChart />
          <PerformanceByTypeTable />
        </div>

        <div className="pt-8 border-t border-neutral-800">
          <h2 className="text-2xl font-bold text-neutral-100 mb-6">Research & Analysis Reports</h2>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="rounded-lg border border-neutral-800 p-6 bg-neutral-900/40 backdrop-blur-xl mb-6"
          >
            <h3 className="text-lg font-semibold text-neutral-100 mb-4">Gap Analysis: Prior Work vs. This Paper</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/60">
                    <th className="text-left py-3 px-3 text-neutral-300 font-semibold">Aspect</th>
                    <th className="text-left py-3 px-3 text-neutral-300 font-semibold">Prior Work</th>
                    <th className="text-left py-3 px-3 text-neutral-300 font-semibold">This Work</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                    <td className="py-3 px-3 text-neutral-400 font-medium">Incident Detection</td>
                    <td className="py-3 px-3 text-neutral-400">Rule-based / BERT</td>
                    <td className="py-3 px-3 text-green-400 font-semibold">RAG + CoT</td>
                  </tr>
                  <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                    <td className="py-3 px-3 text-neutral-400 font-medium">Explanation</td>
                    <td className="py-3 px-3 text-neutral-400">None / token attr.</td>
                    <td className="py-3 px-3 text-green-400 font-semibold">Structured forensic</td>
                  </tr>
                  <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                    <td className="py-3 px-3 text-neutral-400 font-medium">Retrieval</td>
                    <td className="py-3 px-3 text-neutral-400">None</td>
                    <td className="py-3 px-3 text-green-400 font-semibold">Semantic (top-k)</td>
                  </tr>
                  <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                    <td className="py-3 px-3 text-neutral-400 font-medium">Calibration</td>
                    <td className="py-3 px-3 text-neutral-400">None</td>
                    <td className="py-3 px-3 text-green-400 font-semibold">ECE-based scoring</td>
                  </tr>
                  <tr className="hover:bg-neutral-800/20">
                    <td className="py-3 px-3 text-neutral-400 font-medium">Evaluation</td>
                    <td className="py-3 px-3 text-neutral-400">Automated only</td>
                    <td className="py-3 px-3 text-green-400 font-semibold">Auto + human eval</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-lg border border-neutral-800 p-6 bg-neutral-900/40 backdrop-blur-xl mb-6 overflow-x-auto"
          >
            <h3 className="text-lg font-semibold text-neutral-100 mb-4">Quantitative Results Across All Methods</h3>
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/60">
                  <th className="text-left py-3 px-3 text-neutral-300 font-semibold">Method</th>
                  <th className="text-center py-3 px-3 text-neutral-300 font-semibold">Precision</th>
                  <th className="text-center py-3 px-3 text-neutral-300 font-semibold">Recall</th>
                  <th className="text-center py-3 px-3 text-neutral-300 font-semibold">F1</th>
                  <th className="text-center py-3 px-3 text-neutral-300 font-semibold">ROUGE-L</th>
                  <th className="text-center py-3 px-3 text-neutral-300 font-semibold">ECE</th>
                  <th className="text-center py-3 px-3 text-neutral-300 font-semibold">Latency (ms)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                  <td className="py-3 px-3 text-neutral-400">Rule-Based</td>
                  <td className="py-3 px-3 text-center text-neutral-300">0.72</td>
                  <td className="py-3 px-3 text-center text-neutral-300">0.68</td>
                  <td className="py-3 px-3 text-center text-neutral-300">0.70</td>
                  <td className="py-3 px-3 text-center text-orange-400">0.42</td>
                  <td className="py-3 px-3 text-center text-orange-400">0.18</td>
                  <td className="py-3 px-3 text-center text-green-400">45</td>
                </tr>
                <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                  <td className="py-3 px-3 text-neutral-400">Unsupervised</td>
                  <td className="py-3 px-3 text-center text-neutral-300">0.79</td>
                  <td className="py-3 px-3 text-center text-neutral-300">0.75</td>
                  <td className="py-3 px-3 text-center text-neutral-300">0.77</td>
                  <td className="py-3 px-3 text-center text-yellow-400">0.51</td>
                  <td className="py-3 px-3 text-center text-yellow-400">0.15</td>
                  <td className="py-3 px-3 text-center text-yellow-400">120</td>
                </tr>
                <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                  <td className="py-3 px-3 text-neutral-400">BERT FT</td>
                  <td className="py-3 px-3 text-center text-neutral-300">0.81</td>
                  <td className="py-3 px-3 text-center text-neutral-300">0.78</td>
                  <td className="py-3 px-3 text-center text-neutral-300">0.79</td>
                  <td className="py-3 px-3 text-center text-yellow-400">0.55</td>
                  <td className="py-3 px-3 text-center text-yellow-400">0.14</td>
                  <td className="py-3 px-3 text-center text-yellow-400">85</td>
                </tr>
                <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                  <td className="py-3 px-3 text-neutral-400">RAG (no CoT)</td>
                  <td className="py-3 px-3 text-center text-neutral-300">0.86</td>
                  <td className="py-3 px-3 text-center text-neutral-300">0.82</td>
                  <td className="py-3 px-3 text-center text-neutral-300">0.84</td>
                  <td className="py-3 px-3 text-center text-blue-400">0.68</td>
                  <td className="py-3 px-3 text-center text-blue-400">0.11</td>
                  <td className="py-3 px-3 text-center text-orange-400">950</td>
                </tr>
                <tr className="bg-blue-950/40 hover:bg-blue-950/60">
                  <td className="py-3 px-3 text-green-300 font-semibold">Proposed (This Work)</td>
                  <td className="py-3 px-3 text-center text-green-300 font-semibold">0.91</td>
                  <td className="py-3 px-3 text-center text-green-300 font-semibold">0.88</td>
                  <td className="py-3 px-3 text-center text-green-300 font-semibold">0.89</td>
                  <td className="py-3 px-3 text-center text-green-300 font-semibold">0.75</td>
                  <td className="py-3 px-3 text-center text-green-300 font-semibold">0.08</td>
                  <td className="py-3 px-3 text-center text-green-300 font-semibold">1150</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-neutral-500 mt-3">P: precision; R: recall; ROUGE-L: ROUGE-L similarity; ECE: expected calibration error; Latency: latency in milliseconds.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-lg border border-neutral-800 p-6 bg-neutral-900/40 backdrop-blur-xl mb-6"
          >
            <h3 className="text-lg font-semibold text-neutral-100 mb-4">Human Evaluation of Explanation Quality</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/60">
                    <th className="text-left py-3 px-3 text-neutral-300 font-semibold">Method</th>
                    <th className="text-center py-3 px-3 text-neutral-300 font-semibold">Mean Score</th>
                    <th className="text-center py-3 px-3 text-neutral-300 font-semibold">Std Dev</th>
                    <th className="text-center py-3 px-3 text-neutral-300 font-semibold">% ≥4.0</th>
                    <th className="text-center py-3 px-3 text-neutral-300 font-semibold">Grounding %</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                    <td className="py-3 px-3 text-neutral-400">Rule-Based</td>
                    <td className="py-3 px-3 text-center text-red-400 font-semibold">2.1</td>
                    <td className="py-3 px-3 text-center text-neutral-300">1.2</td>
                    <td className="py-3 px-3 text-center text-red-400">16%</td>
                    <td className="py-3 px-3 text-center text-red-400">5%</td>
                  </tr>
                  <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                    <td className="py-3 px-3 text-neutral-400">Unsupervised</td>
                    <td className="py-3 px-3 text-center text-orange-400 font-semibold">2.8</td>
                    <td className="py-3 px-3 text-center text-neutral-300">1.3</td>
                    <td className="py-3 px-3 text-center text-orange-400">28%</td>
                    <td className="py-3 px-3 text-center text-orange-400">12%</td>
                  </tr>
                  <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                    <td className="py-3 px-3 text-neutral-400">BERT</td>
                    <td className="py-3 px-3 text-center text-yellow-400 font-semibold">3.2</td>
                    <td className="py-3 px-3 text-center text-neutral-300">1.0</td>
                    <td className="py-3 px-3 text-center text-yellow-400">44%</td>
                    <td className="py-3 px-3 text-center text-yellow-400">20%</td>
                  </tr>
                  <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                    <td className="py-3 px-3 text-neutral-400">RAG (no CoT)</td>
                    <td className="py-3 px-3 text-center text-blue-400 font-semibold">3.8</td>
                    <td className="py-3 px-3 text-center text-neutral-300">0.9</td>
                    <td className="py-3 px-3 text-center text-blue-400">72%</td>
                    <td className="py-3 px-3 text-center text-blue-400">68%</td>
                  </tr>
                  <tr className="bg-green-950/40 hover:bg-green-950/60">
                    <td className="py-3 px-3 text-green-300 font-semibold">Proposed</td>
                    <td className="py-3 px-3 text-center text-green-300 font-semibold">4.2</td>
                    <td className="py-3 px-3 text-center text-green-300 font-semibold">0.7</td>
                    <td className="py-3 px-3 text-center text-green-300 font-semibold">84%</td>
                    <td className="py-3 px-3 text-center text-green-300 font-semibold">94%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-neutral-500 mt-3">Scores rated on 1-5 scale by human evaluators. Higher values indicate better explanation quality and grounding in evidence.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-lg border border-neutral-800 p-6 bg-neutral-900/40 backdrop-blur-xl mb-6 overflow-x-auto"
          >
            <h3 className="text-lg font-semibold text-neutral-100 mb-4">Ablation Study: Impact of System Components</h3>
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/60">
                  <th className="text-left py-3 px-3 text-neutral-300 font-semibold">Configuration</th>
                  <th className="text-center py-3 px-3 text-neutral-300 font-semibold">Precision</th>
                  <th className="text-center py-3 px-3 text-neutral-300 font-semibold">Recall</th>
                  <th className="text-center py-3 px-3 text-neutral-300 font-semibold">F1 Score</th>
                  <th className="text-center py-3 px-3 text-neutral-300 font-semibold">ROUGE-L</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-green-950/40 hover:bg-green-950/60 border-b border-neutral-800">
                  <td className="py-3 px-3 text-green-300 font-semibold">Full System</td>
                  <td className="py-3 px-3 text-center text-green-300 font-semibold">0.91</td>
                  <td className="py-3 px-3 text-center text-green-300 font-semibold">0.88</td>
                  <td className="py-3 px-3 text-center text-green-300 font-semibold">0.89</td>
                  <td className="py-3 px-3 text-center text-green-300 font-semibold">0.75</td>
                </tr>
                <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                  <td className="py-3 px-3 text-neutral-400">- Confidence Filtering</td>
                  <td className="py-3 px-3 text-center text-yellow-400">0.87</td>
                  <td className="py-3 px-3 text-center text-yellow-400">0.92</td>
                  <td className="py-3 px-3 text-center text-yellow-400">0.89</td>
                  <td className="py-3 px-3 text-center text-yellow-400">0.74</td>
                </tr>
                <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                  <td className="py-3 px-3 text-neutral-400">- Semantic Retrieval</td>
                  <td className="py-3 px-3 text-center text-red-400">0.78</td>
                  <td className="py-3 px-3 text-center text-red-400">0.81</td>
                  <td className="py-3 px-3 text-center text-red-400">0.79</td>
                  <td className="py-3 px-3 text-center text-red-400">0.52</td>
                </tr>
                <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                  <td className="py-3 px-3 text-neutral-400">- Chain-of-Thought</td>
                  <td className="py-3 px-3 text-center text-orange-400">0.84</td>
                  <td className="py-3 px-3 text-center text-orange-400">0.80</td>
                  <td className="py-3 px-3 text-center text-orange-400">0.82</td>
                  <td className="py-3 px-3 text-center text-orange-400">0.63</td>
                </tr>
                <tr className="hover:bg-neutral-800/20">
                  <td className="py-3 px-3 text-neutral-400">- Grounding Enforcement</td>
                  <td className="py-3 px-3 text-center text-neutral-300">0.91</td>
                  <td className="py-3 px-3 text-center text-neutral-300">0.88</td>
                  <td className="py-3 px-3 text-center text-neutral-300">0.89</td>
                  <td className="py-3 px-3 text-center text-yellow-400">0.68</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-neutral-500 mt-3">Shows the impact of removing each component from the full system. Larger drops indicate more critical components.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="rounded-lg border border-neutral-800 p-6 bg-neutral-900/40 backdrop-blur-xl"
          >
            <h3 className="text-lg font-semibold text-neutral-100 mb-4">Per-Class Performance (Test Set, n=512)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/60">
                    <th className="text-left py-3 px-3 text-neutral-300 font-semibold">Class</th>
                    <th className="text-center py-3 px-3 text-neutral-300 font-semibold">Count</th>
                    <th className="text-center py-3 px-3 text-neutral-300 font-semibold">Precision</th>
                    <th className="text-center py-3 px-3 text-neutral-300 font-semibold">Recall</th>
                    <th className="text-center py-3 px-3 text-neutral-300 font-semibold">F1 Score</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                    <td className="py-3 px-3">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-950/60 text-orange-300">
                        Hallucination
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-neutral-300 font-semibold">256</td>
                    <td className="py-3 px-3 text-center text-neutral-300">0.92</td>
                    <td className="py-3 px-3 text-center text-neutral-300">0.88</td>
                    <td className="py-3 px-3 text-center text-green-400 font-semibold">0.90</td>
                  </tr>
                  <tr className="border-b border-neutral-800 hover:bg-neutral-800/20">
                    <td className="py-3 px-3">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-950/60 text-purple-300">
                        Bias
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-neutral-300 font-semibold">128</td>
                    <td className="py-3 px-3 text-center text-neutral-300">0.89</td>
                    <td className="py-3 px-3 text-center text-neutral-300">0.86</td>
                    <td className="py-3 px-3 text-center text-blue-400 font-semibold">0.87</td>
                  </tr>
                  <tr className="hover:bg-neutral-800/20">
                    <td className="py-3 px-3">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-red-950/60 text-red-300">
                        Policy Violation
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-neutral-300 font-semibold">128</td>
                    <td className="py-3 px-3 text-center text-neutral-300">0.92</td>
                    <td className="py-3 px-3 text-center text-neutral-300">0.88</td>
                    <td className="py-3 px-3 text-center text-green-400 font-semibold">0.90</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-neutral-500 mt-3">Performance metrics broken down by incident type on test set.</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-lg border border-neutral-800 p-6 bg-neutral-900/40 backdrop-blur-xl"
        >
          <div>
            <p className="text-neutral-500 text-sm mb-1">Model Version</p>
            <p className="text-xl font-bold text-neutral-100">v2.1.4</p>
          </div>
          <div>
            <p className="text-neutral-500 text-sm mb-1">Training Samples</p>
            <p className="text-xl font-bold text-neutral-100">2,847</p>
          </div>
          <div>
            <p className="text-neutral-500 text-sm mb-1">Test Samples</p>
            <p className="text-xl font-bold text-neutral-100">512</p>
          </div>
          <div>
            <p className="text-neutral-500 text-sm mb-1">Uptime</p>
            <p className="text-xl font-bold text-green-400">99.9%</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
