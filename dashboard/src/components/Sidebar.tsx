import React from 'react';
import { 
  Activity, Shield, Zap, Terminal, Server, Cpu, Brain, Award,
  ChevronRight 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  version?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, version = "v1.0.0" }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'traces', label: 'Trace Explorer', icon: Terminal },
    { id: 'memory', label: 'Agent Memory', icon: Brain },
    { id: 'evaluation', label: 'Agent Evals', icon: Award },
    { id: 'metrics', label: 'Metrics (Prometheus)', icon: Server },
    { id: 'security', label: 'AI Security & Risk', icon: Shield },
    { id: 'chaos', label: 'Chaos Engineering', icon: Zap },
    { id: 'governance', label: 'Runtime Governance', icon: Cpu },
  ];

  return (
    <aside className="m-4 flex w-64 flex-col justify-between rounded-3xl bg-[#0B0F19] p-6 text-white shadow-2xl border border-slate-800/80 transition-all duration-300 select-none">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-xl font-black tracking-wider text-cyan-400 shadow-inner border border-slate-700/60">
            ⬡
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">databerry™</span>
            <span className="ml-1 text-[10px] uppercase font-semibold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded-full border border-cyan-800/50">Gemma SLM</span>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="mt-8 flex items-center gap-3 rounded-2xl bg-slate-900/80 p-3 backdrop-blur-md border border-slate-800">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-400 p-0.5">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0B0F19] text-xs font-bold text-cyan-300">
              LN
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="truncate text-sm font-semibold text-white">Lawrence E.</h4>
            <p className="truncate text-xs text-slate-400">Principal AI Architect</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="mt-8 space-y-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all text-left ${
                  isActive
                    ? 'bg-[#1E293B] text-white shadow-md ring-1 ring-slate-700/60 border-l-2 border-cyan-400'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 text-left">
                  <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="text-left whitespace-nowrap truncate text-xs font-semibold">{item.label}</span>
                </div>
                <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${isActive ? 'opacity-100 translate-x-0.5' : 'opacity-40'}`} />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-800/80 pt-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] font-semibold text-emerald-300">Local Gemma Active</span>
        </div>
        <p className="mt-1 text-[10px] text-slate-500">
          ai-runtime-observatory {version}
        </p>
      </div>
    </aside>
  );
};
