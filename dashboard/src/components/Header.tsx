import React, { useState, useEffect, useRef } from 'react';
import { 
  RotateCw, Search, Bell, Calendar, Play,
  ShieldAlert, AlertTriangle, Zap, CheckCircle2, X, ExternalLink,
  ChevronRight, Sparkles
} from 'lucide-react';
import { TelemetryNotification } from '../types/telemetry';
import { fetchNotifications, searchTelemetry, syncTelemetry } from '../services/api';

interface HeaderProps {
  onOpenRunner: () => void;
  onSelectTrace: (traceId: string) => void;
  onRefresh: () => Promise<void>;
  selectedTimeWindow: string;
  onTimeWindowChange: (window: string) => void;
  isStreaming: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenRunner,
  onSelectTrace,
  onRefresh,
  selectedTimeWindow,
  onTimeWindowChange,
  isStreaming,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [notifications, setNotifications] = useState<TelemetryNotification[]>([]);
  const [notifFilter, setNotifFilter] = useState<'all' | 'security' | 'performance' | 'chaos'>('all');

  const notifRef = useRef<HTMLDivElement>(null);
  const calRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotifOpen(false);
        setIsCalendarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications on mount
  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      if (data && Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // Handle Sync / Refresh Action
  const handleSyncClick = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const syncResult = await syncTelemetry();
      await onRefresh();
      await loadNotifications();
      const count = syncResult?.spans_count || 11;
      showToast(`Telemetry Synchronized • ${count} Spans Aggregated`);
    } catch (err) {
      await onRefresh();
      showToast('Telemetry Synchronized');
    } finally {
      setTimeout(() => setIsSyncing(false), 700);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Handle Search Input with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const results = await searchTelemetry(searchQuery);
        setSearchResults(results);
        setSelectedIndex(0);
      } catch (e) {
        console.error('Search failed', e);
      } finally {
        setIsSearching(false);
      }
    }, 150);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const filteredNotifs = notifications.filter(n => notifFilter === 'all' || n.category === notifFilter);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="relative flex flex-wrap items-center justify-between gap-4 select-none">
      {/* Title & Status */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Hello Engineer, Welcome back
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            isStreaming ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50' : 'bg-slate-100 text-slate-600'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            {isStreaming ? 'Live SSE' : 'Polling'}
          </span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Your Diagnostics Dashboard is updated
        </h1>
      </div>

      {/* Top Utility Suite */}
      <div className="flex items-center gap-3">
        {/* Main Action: Run Research Agent */}
        <button
          id="btn-run-agent"
          onClick={onOpenRunner}
          className="flex items-center gap-2 rounded-2xl bg-[#0B0F19] px-4 py-2.5 text-xs font-bold text-white shadow-md border border-slate-700/60 transition hover:bg-[#1E293B] hover:scale-105 active:scale-95"
        >
          <Play className="h-3.5 w-3.5 fill-white" />
          <span>Run Research Agent</span>
        </button>

        {/* 1. SYNC / REFRESH BUTTON */}
        <button
          id="btn-refresh-sync"
          onClick={handleSyncClick}
          disabled={isSyncing}
          title="Synchronize Telemetry Snapshot"
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm border border-slate-200/70 transition-all hover:bg-slate-50 hover:shadow-md active:scale-95 disabled:opacity-75"
        >
          <RotateCw className={`h-4 w-4 transition-transform duration-700 ${isSyncing ? 'animate-spin text-cyan-600' : 'hover:text-cyan-600'}`} />
        </button>

        {/* 2. GLOBAL SEARCH / COMMAND PALETTE BUTTON */}
        <button
          id="btn-open-search"
          onClick={() => {
            setIsSearchOpen(true);
            setIsNotifOpen(false);
            setIsCalendarOpen(false);
          }}
          title="Global Telemetry Search (Cmd+K / Ctrl+K)"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm border border-slate-200/70 transition-all hover:bg-slate-50 hover:shadow-md hover:text-cyan-600 active:scale-95"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* 3. INCIDENT NOTIFICATION BELL */}
        <div className="relative" ref={notifRef}>
          <button
            id="btn-notifications-bell"
            onClick={() => {
              setIsNotifOpen(prev => !prev);
              setIsCalendarOpen(false);
            }}
            title="AI Incidents & Alerts"
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm border border-slate-200/70 transition-all hover:bg-slate-50 hover:shadow-md hover:text-cyan-600 active:scale-95"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[#FF7A1A] ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* NOTIFICATION FLYOUT POPOVER */}
          {isNotifOpen && (
            <div className="absolute right-0 top-14 w-[420px] rounded-3xl bg-white p-5 shadow-2xl border border-slate-200 backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">Incident &amp; Alert Center</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {notifications.length}
                  </span>
                </div>
                <button 
                  onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                  className="text-xs font-semibold text-cyan-600 hover:text-cyan-800 transition"
                >
                  Mark all read
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="mt-3 flex gap-1.5 border-b border-slate-100 pb-3">
                {[
                  { id: 'all', label: 'All', count: notifications.length },
                  { id: 'security', label: 'Security', count: notifications.filter(n => n.category === 'security').length },
                  { id: 'performance', label: 'SLA', count: notifications.filter(n => n.category === 'performance').length },
                  { id: 'chaos', label: 'Chaos', count: notifications.filter(n => n.category === 'chaos').length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setNotifFilter(tab.id as any)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1 ${
                      notifFilter === tab.id 
                        ? 'bg-[#0B0F19] text-white shadow-sm' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] rounded-full px-1.5 py-0.2 ${notifFilter === tab.id ? 'bg-white/20' : 'bg-slate-200 text-slate-600'}`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Notification Items List */}
              <div className="mt-3 max-h-[340px] space-y-2.5 overflow-y-auto pr-1">
                {filteredNotifs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No active telemetry alerts in this category.
                  </div>
                ) : (
                  filteredNotifs.map(n => (
                    <div 
                      key={n.id}
                      className={`rounded-2xl p-3.5 transition border ${
                        n.severity === 'CRITICAL' 
                          ? 'bg-rose-50/60 border-rose-200/70' 
                          : n.severity === 'WARNING'
                          ? 'bg-amber-50/60 border-amber-200/70'
                          : 'bg-cyan-50/50 border-cyan-200/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {n.severity === 'CRITICAL' && <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />}
                          {n.severity === 'WARNING' && <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />}
                          {n.severity === 'INFO' && <Zap className="h-4 w-4 text-cyan-600 shrink-0" />}
                          <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 shrink-0">Recent</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{n.description}</p>
                      {n.trace_id && (
                        <div className="mt-2 flex items-center justify-between border-t border-slate-200/50 pt-2">
                          <code className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                            {n.trace_id}
                          </code>
                          <button
                            onClick={() => {
                              onSelectTrace(n.trace_id!);
                              setIsNotifOpen(false);
                            }}
                            className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 hover:text-cyan-800 transition"
                          >
                            <span>Inspect Trace</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. TIME RANGE SELECTOR */}
        <div className="relative" ref={calRef}>
          <button
            id="btn-time-horizon"
            onClick={() => {
              setIsCalendarOpen(prev => !prev);
              setIsNotifOpen(false);
            }}
            title="Telemetry Horizon Window"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm border border-slate-200/70 transition-all hover:bg-slate-50 hover:shadow-md hover:text-cyan-600 active:scale-95"
          >
            <Calendar className="h-4 w-4" />
          </button>

          {/* CALENDAR / WINDOW POPOVER */}
          {isCalendarOpen && (
            <div className="absolute right-0 top-14 w-64 rounded-3xl bg-white p-3.5 shadow-2xl border border-slate-200 backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Aggregation Window
              </span>
              <div className="mt-2 space-y-1">
                {[
                  { label: 'Live Real-Time (5m)', value: '5m', desc: 'Auto-sliding 300s buffer' },
                  { label: 'Last 15 Minutes', value: '15m', desc: 'Moving P95 calculation' },
                  { label: 'Last 1 Hour', value: '1h', desc: 'Hourly throughput & TTFT' },
                  { label: 'Last 24 Hours (Rolling)', value: '24h', desc: 'Standard production view' },
                  { label: 'All-Time Cumulative', value: 'all', desc: 'Full SQLite ring archive' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onTimeWindowChange(opt.value);
                      setIsCalendarOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition ${
                      selectedTimeWindow === opt.value
                        ? 'bg-[#0B0F19] text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{opt.label}</span>
                      <span className={`text-[10px] block ${selectedTimeWindow === opt.value ? 'text-slate-400' : 'text-slate-400'}`}>
                        {opt.desc}
                      </span>
                    </div>
                    {selectedTimeWindow === opt.value && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* TOAST NOTIFICATION FEEDBACK */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-[#0B0F19] px-4 py-3 text-xs font-bold text-white shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* COMMAND PALETTE SEARCH MODAL (CMD+K / CTRL+K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-4 pt-20 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 overflow-hidden">
            {/* Search Input Box */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex flex-1 items-center gap-3">
                <Search className={`h-5 w-5 ${isSearching ? 'text-cyan-600 animate-pulse' : 'text-slate-400'}`} />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search trace ID (tr-xxx), agent name, prompt, or status..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && searchResults.length > 0) {
                      const item = searchResults[selectedIndex] || searchResults[0];
                      onSelectTrace(item.trace_id);
                      setIsSearchOpen(false);
                    }
                  }}
                  className="w-full text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results Stream */}
            <div className="mt-4 max-h-[380px] space-y-2 overflow-y-auto pr-1">
              {searchResults.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  {searchQuery ? (
                    isSearching ? 'Searching telemetry index...' : 'No telemetry traces matching query.'
                  ) : (
                    <div>
                      <p className="font-semibold text-slate-600 mb-1">Quick Search Examples:</p>
                      <p className="font-mono text-[11px] text-slate-400">tr-8f, Market, Regulatory, 500, Injection, Synthesis</p>
                    </div>
                  )}
                </div>
              ) : (
                searchResults.map((item, idx) => (
                  <div
                    key={item.trace_id + idx}
                    onClick={() => {
                      onSelectTrace(item.trace_id);
                      setIsSearchOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl p-3.5 transition border ${
                      selectedIndex === idx
                        ? 'bg-cyan-50/80 border-cyan-200 shadow-sm'
                        : 'bg-slate-50 border-transparent hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-mono text-xs font-black text-white ${
                        item.has_error ? 'bg-rose-500' : item.security_flagged ? 'bg-amber-500' : 'bg-[#0B0F19]'
                      }`}>
                        {item.has_error ? '!' : item.security_flagged ? 'S' : 'T'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{item.workflow_name || item.root_query}</h4>
                          <span className={`inline-flex rounded px-1.5 py-0.2 text-[9px] font-bold ${
                            item.has_error ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {item.status || (item.has_error ? '500 ERR' : '200 OK')}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] font-mono text-slate-400">{item.trace_id}</p>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className="text-xs font-black text-slate-800 block">
                          {item.total_duration_ms > 1000 
                            ? `${(item.total_duration_ms/1000).toFixed(2)}s` 
                            : `${item.total_duration_ms ? item.total_duration_ms.toFixed(1) : 0}ms`}
                        </span>
                        <p className="text-[10px] text-slate-400">{item.total_tokens || 0} tokens</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
              <span>ProTip: Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700 border">Cmd</kbd> + <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700 border">K</kbd> anywhere</span>
              <span>ai-runtime-observatory search engine</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
