import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  Search,
  Database,
  MessageSquare,
  Settings as SettingsIcon,
} from "lucide-react";
import AnalyzePage from "./pages/AnalyzePage";
import CorpusPage from "./pages/CorpusPage";
import EvalPage from "./pages/EvalPage";
import SandboxPage from "./pages/SandboxPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">AI Incident</h1>
              <p className="text-xs text-slate-500">Investigator</p>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <NavItem
              to="/"
              icon={<LayoutDashboard size={20} />}
              label="Dashboard"
            />
            <NavItem
              to="/analyze"
              icon={<Search size={20} />}
              label="Analyze Incident"
            />
            <NavItem
              to="/sandbox"
              icon={<MessageSquare size={20} />}
              label="Chat Sandbox"
            />
            <NavItem
              to="/corpus"
              icon={<Database size={20} />}
              label="Incident Corpus"
            />
            <NavItem
              to="/eval"
              icon={<Shield size={20} />}
              label="Evaluation"
            />
          </nav>
          <div className="p-4 border-t border-slate-200">
            <NavItem
              to="/settings"
              icon={<SettingsIcon size={20} />}
              label="Settings"
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<AnalyzePage />} />{" "}
            {/* Default to Analyze for now */}
            <Route path="/analyze" element={<AnalyzePage />} />
            <Route path="/sandbox" element={<SandboxPage />} />
            <Route path="/corpus" element={<CorpusPage />} />
            <Route path="/eval" element={<EvalPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function NavItem({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-slate-700 hover:bg-slate-100 hover:text-blue-700 transition-colors font-medium text-sm"
    >
      {icon}
      {label}
    </Link>
  );
}

export default App;
