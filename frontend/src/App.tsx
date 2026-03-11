import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  Search,
  Database,
  MessageSquare,
  Settings as SettingsIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { Sidebar, SidebarBody, SidebarLink } from "./components/ui/sidebar";
import { Link } from "react-router-dom";
import AnalyzePage from "./pages/AnalyzePage";
import CorpusPage from "./pages/CorpusPage";
import EvalPage from "./pages/EvalPage";
import SandboxPage from "./pages/SandboxPage";
import SettingsPage from "./pages/SettingsPage";
import HomePage from "./pages/HomePage";

const navLinks = [
  {
    label: "Dashboard",
    href: "/",
    icon: <LayoutDashboard className="text-neutral-400 h-5 w-5 flex-shrink-0" />,
  },
  {
    label: "Analyze Incident",
    href: "/analyze",
    icon: <Search className="text-neutral-400 h-5 w-5 flex-shrink-0" />,
  },
  {
    label: "Chat Sandbox",
    href: "/sandbox",
    icon: <MessageSquare className="text-neutral-400 h-5 w-5 flex-shrink-0" />,
  },
  {
    label: "Incident Corpus",
    href: "/corpus",
    icon: <Database className="text-neutral-400 h-5 w-5 flex-shrink-0" />,
  },
  {
    label: "Evaluation",
    href: "/eval",
    icon: <Shield className="text-neutral-400 h-5 w-5 flex-shrink-0" />,
  },
];

const settingsLink = {
  label: "Settings",
  href: "/settings",
  icon: <SettingsIcon className="text-neutral-400 h-5 w-5 flex-shrink-0" />,
};

function AppShell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 font-sans overflow-hidden">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10 h-full">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 py-2 px-2 mb-4 min-w-0">
              <div className="bg-blue-600 p-1.5 rounded-lg flex-shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <motion.div
                animate={{
                  display: open ? "block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="overflow-hidden"
              >
                <span className="font-bold text-neutral-100 whitespace-nowrap text-sm leading-tight block">
                  AI Incident
                </span>
                <span className="text-xs text-neutral-500 whitespace-nowrap block">
                  Investigator
                </span>
              </motion.div>
            </Link>

            {/* Nav links */}
            <div className="flex flex-col gap-0.5">
              {navLinks.map((link) => (
                <SidebarLink key={link.href} link={link} />
              ))}
            </div>
          </div>

          {/* Bottom settings */}
          <div className="border-t border-neutral-800 pt-3">
            <SidebarLink link={settingsLink} />
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-neutral-950">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/sandbox" element={<SandboxPage />} />
          <Route path="/corpus" element={<CorpusPage />} />
          <Route path="/eval" element={<EvalPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
