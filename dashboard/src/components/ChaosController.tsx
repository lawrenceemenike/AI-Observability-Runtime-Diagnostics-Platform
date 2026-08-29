import React, { useState, useEffect } from 'react';
import { Zap, AlertTriangle, Play, CheckCircle2, ShieldAlert, Cpu, Activity } from 'lucide-react';
import { ChaosExperimentConfig } from '../types/telemetry';
import { fetchChaosConfig, updateChaosConfig, injectChaosFault } from '../services/api';

interface ChaosControllerProps {
  onTraceGenerated?: (traceId: string) => void;
}

export const ChaosController: React.FC<ChaosControllerProps> = ({ onTraceGenerated }) => {
  const [config, setConfig] = useState<ChaosExperimentConfig>({
    target_node: 'calculator_tool',
    fault_type: 'http_500',
    latency_ms: 2000,
    error_rate: 1.0,
    enabled: false,
  });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchChaosConfig().then(setConfig).catch(console.error);
  }, []);

  const handleSaveConfig = async (newCfg: ChaosExperimentConfig) => {
    setConfig(newCfg);
    try {
      await updateChaosConfig(newCfg);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInjectFault = async () => {
    setRunning(true);
    setResult(null);
    try {
      const activeCfg = { ...config, enabled: true };
      const res = await injectChaosFault(activeCfg);
      setResult(res);
      if (onTraceGenerated && res.result_trace_id) {
        onTraceGenerated(res.result_trace_id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#0B0F19] p-6 text-white shadow-md border border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Chaos Engineering</span>
          <h2 className="text-2xl font-black text-white mt-1">Causal Fault-Injection Studio</h2>
          <p className="text-xs text-slate-400 mt-1">
            Simulate sub-system latency spikes, tool HTTP 500s, and vector retrieval timeouts to test runtime resilience.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`rounded-2xl px-4 py-2 text-center backdrop-blur-md ${
            config.enabled ? 'bg-amber-500/20 border border-amber-400/40' : 'bg-white/10'
          }`}>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Chaos Middleware</span>
            <p className={`text-sm font-black ${config.enabled ? 'text-amber-300' : 'text-slate-300'}`}>
              {config.enabled ? '● ARMED / ACTIVE' : '○ STANDBY'}
            </p>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Experiment Configuration */}
        <div className="lg:col-span-2 rounded-3xl bg-white p-6 shadow-sm border border-slate-100 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Configure Fault Injection</h3>
            
            {/* Toggle Enable */}
            <label className="flex cursor-pointer items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Enable Faults</span>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => handleSaveConfig({ ...config, enabled: e.target.checked })}
                className="h-5 w-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Target Node Selection */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
              Target Execution Node
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'calculator_tool', label: 'Calculator Tool' },
                { id: 'retriever', label: 'Vector Retriever' },
                { id: 'market_search_tool', label: 'Search Tool' },
                { id: 'gemma_inference', label: 'Local Gemma SLM' },
              ].map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleSaveConfig({ ...config, target_node: n.id })}
                  className={`rounded-2xl p-3 text-left border transition ${
                    config.target_node === n.id
                      ? 'border-cyan-600 bg-cyan-50/70 text-cyan-900 font-bold shadow-sm'
                      : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <p className="text-xs">{n.label}</p>
                  <span className="text-[10px] font-mono text-slate-400">{n.id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fault Type Selection */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
              Fault Primitive Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'http_500', label: 'HTTP 500 Error', desc: 'Simulates fatal tool exception' },
                { id: 'latency_spike', label: 'Latency Spike', desc: 'Adds artificial sleep delay' },
                { id: 'timeout', label: 'Timeout Exceeded', desc: 'Exceeds node deadline' },
                { id: 'malformed_payload', label: 'Malformed Schema', desc: 'Corrupted payload return' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSaveConfig({ ...config, fault_type: f.id })}
                  className={`rounded-2xl p-3 text-left border transition ${
                    config.fault_type === f.id
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold shadow-sm'
                      : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <p className="text-xs">{f.label}</p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-600">Artificial Latency</span>
                <span className="text-cyan-600 font-mono">{config.latency_ms}ms</span>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={config.latency_ms}
                onChange={(e) => handleSaveConfig({ ...config, latency_ms: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0B0F19]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-600">Error Probability</span>
                <span className="text-rose-600 font-mono">{(config.error_rate * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={config.error_rate}
                onChange={(e) => handleSaveConfig({ ...config, error_rate: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#FF7A1A]"
              />
            </div>
          </div>

          {/* Inject Button */}
          <div className="pt-3">
            <button
              id="btn-trigger-chaos-experiment"
              onClick={handleInjectFault}
              disabled={running}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 p-4 text-xs font-black uppercase tracking-wider text-white shadow-lg transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              <span>{running ? 'Injecting Chaos & Running Workflow...' : 'Inject Chaos Fault & Trigger Test Run'}</span>
            </button>
          </div>
        </div>

        {/* Right Col: Result & Circuit Breaker Attribution */}
        <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
              <h4 className="text-sm font-bold text-white">Chaos Execution Result</h4>
            </div>

            {result ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="rounded-xl bg-black/40 p-3 border border-slate-800">
                  <span className="text-slate-400 text-[10px]">Status:</span>
                  <p className={`font-bold ${result.workflow_status === 'FAILED' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {result.workflow_status}
                  </p>
                </div>

                <div className="rounded-xl bg-black/40 p-3 border border-slate-800">
                  <span className="text-slate-400 text-[10px]">Result Trace ID:</span>
                  <p className="text-cyan-300 font-bold">{result.result_trace_id}</p>
                </div>

                {result.error_message && (
                  <div className="rounded-xl bg-rose-950/60 p-3 border border-rose-800/60">
                    <span className="text-rose-300 text-[10px]">Captured Error:</span>
                    <p className="text-rose-200 mt-1">{result.error_message}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Trigger a chaos experiment to observe circuit breaker tripping and automated trace capture.
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl bg-white/5 p-3 text-[11px] text-slate-300">
            <span className="font-bold text-amber-300">Resilience Note:</span> When faults trigger, the platform records exact causal sub-spans to enable Gemma SLM root-cause attribution.
          </div>
        </div>

      </div>
    </div>
  );
};
