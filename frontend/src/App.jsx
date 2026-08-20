import React, { useState, useEffect, useRef } from 'react';
import { Line, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { 
  Activity, Zap, Thermometer, List, Terminal, 
  AlertTriangle, Play, LayoutDashboard, History, Settings, ChevronRight, Cpu, Menu, X, Download, Shield
} from 'lucide-react';
import { FaGithub, FaLinkedin, FaTwitter, FaInstagram } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const MAX_DATA_POINTS = 60;
const IQOO_GOLD = '#FBBF24';
const IQOO_RED = '#DC2626';

function ChartCard({ title, icon: Icon, color, value, unit, data }) {
  const chartData = {
    labels: Array(MAX_DATA_POINTS).fill(''),
    datasets: [
      {
        label: title,
        data: data,
        borderColor: color,
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, `${color}40`);
          gradient.addColorStop(1, `${color}00`);
          return gradient;
        },
        borderWidth: 2,
        fill: true,
        pointRadius: 0,
        tension: 0.2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: { x: { display: false }, y: { display: false, min: 0, suggestedMax: 100 } },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    layout: { padding: 0 }
  };

  return (
    <div className="hud-panel p-5 flex flex-col h-[160px] shrink-0">
      <div className="flex justify-between items-start mb-4 z-10">
        <div>
          <h2 className="text-[11px] font-bold text-[#888] uppercase tracking-[0.2em] flex items-center gap-2">
            <Icon className="w-4 h-4" style={{ color }} /> {title}
          </h2>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono text-5xl font-bold text-white metric-value">
              {value?.toFixed(1) || '0.0'}
            </span>
            <span className="font-mono text-sm font-bold" style={{ color }}>{unit}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 relative w-full mt-auto">
         <div className="absolute -bottom-5 -left-5 w-[calc(100%+40px)] h-[calc(100%+40px)]">
            <Line data={chartData} options={options} />
         </div>
      </div>
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState('Disconnected');
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeProfile, setActiveProfile] = useState('BALANCED');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [telemetry, setTelemetry] = useState({
    npu: Array(MAX_DATA_POINTS).fill(0),
    latency: Array(MAX_DATA_POINTS).fill(0),
    temp: Array(MAX_DATA_POINTS).fill(0),
    battery: 0,
  });
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [codeFix, setCodeFix] = useState(null);
  
  const logsEndRef = useRef(null);
  const terminalEndRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, currentView]);

  useEffect(() => {
    let reconnectTimeout;
    const connect = () => {
      const ws = new WebSocket('ws://localhost:8000/ws/telemetry');
      wsRef.current = ws;
      ws.onopen = () => setStatus('Connected');
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "telemetry") {
          setTelemetry(prev => ({
            npu: [...prev.npu.slice(1), msg.data.npu_load_pct],
            latency: [...prev.latency.slice(1), msg.data.token_latency_ms],
            temp: [...prev.temp.slice(1), msg.data.chip_temp_celsius],
            battery: msg.data.battery_drain_ma
          }));
        } else if (msg.type === "log") {
          const time = new Date().toLocaleTimeString('en-US', { hour12: false });
          const message = msg.data;
          // Skip internal system command echo messages from the dashboard log stream
          if (message.startsWith('Executing Command:')) return;
          setLogs(prev => [...prev.slice(-100), { time, message, id: Math.random().toString(36).substr(2, 9) }]);
        } else if (msg.type === "alert") {
          const alertId = Math.random().toString(36).substr(2, 9) + Date.now();
          setAlerts(prev => [...prev, { id: alertId, text: msg.data, type: 'alert' }]);
          setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== alertId));
          }, 6000);
        } else if (msg.type === "command" && msg.data === "OPTIMIZE_MODEL") {
          const alertId = Math.random().toString(36).substr(2, 9) + Date.now();
          setAlerts(prev => [...prev, { id: alertId, text: "AI OPTIMIZATION COMPLETE: Auto-Quantized to INT8. Token Latency reduced by 60%.", type: 'success' }]);
          setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== alertId));
          }, 8000);
        } else if (msg.type === "code_fix") {
          setCodeFix({ file: msg.file, data: msg.data });
          const time = new Date().toLocaleTimeString('en-US', { hour12: false });
          setLogs(prev => [...prev.slice(-100), { time, message: msg.data, id: Math.random().toString(36).substr(2, 9) }]);
        }
      };
      ws.onclose = () => {
        setStatus('Reconnecting...');
        reconnectTimeout = setTimeout(connect, 2000);
      };
    };
    connect();
    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    let interval;
    const fetchHistory = () => {
      fetch('http://localhost:8000/api/history/telemetry?limit=50')
        .then(res => res.json())
        .then(data => setHistoryData(data))
        .catch(console.error);
    };
    if (currentView === 'history') {
      fetchHistory(); // Fetch immediately on tab open
      interval = setInterval(fetchHistory, 3000); // Auto-refresh every 3 seconds
    }
    return () => clearInterval(interval);
  }, [currentView]);

  const [lastRefresh, setLastRefresh] = useState(new Date());
  useEffect(() => {
    if (currentView === 'history') {
      const tick = setInterval(() => setLastRefresh(new Date()), 1000);
      return () => clearInterval(tick);
    }
  }, [currentView]);

  const triggerStressTest = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: "TRIGGER_STRESS_TEST" }));
    }
  };

  const applyAiFix = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && codeFix) {
      wsRef.current.send(JSON.stringify({ command: "APPLY_FIX", file: codeFix.file }));
      setCodeFix(null);
    }
  };

  const setProfile = (profile) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: `SET_PROFILE_${profile}` }));
      setActiveProfile(profile);
    }
  };

  // Deploy Readiness Score
  const calcDeployScore = () => {
    const lat = telemetry.latency[telemetry.latency.length - 1] || 50;
    const tmp = telemetry.temp[telemetry.temp.length - 1] || 80;
    const npu = telemetry.npu[telemetry.npu.length - 1] || 80;
    let score = 0;
    score += lat < 10 ? 25 : lat < 20 ? 18 : lat < 40 ? 10 : 0;
    score += tmp < 50 ? 25 : tmp < 65 ? 18 : tmp < 80 ? 10 : 0;
    score += npu < 40 ? 25 : npu < 60 ? 18 : npu < 80 ? 10 : 0;
    score += activeProfile === 'ECO' ? 25 : activeProfile === 'BALANCED' ? 18 : 5;
    return score;
  };
  const deployScore = calcDeployScore();

  // Export Performance Report
  const exportReport = () => {
    const lat = telemetry.latency[telemetry.latency.length - 1];
    const tmp = telemetry.temp[telemetry.temp.length - 1];
    const npu = telemetry.npu[telemetry.npu.length - 1];
    const report = {
      project: 'NPU Trace AI Optimizer',
      timestamp: new Date().toISOString(),
      session: {
        profile: activeProfile,
        deployScore,
        currentMetrics: { npuLoad: npu?.toFixed(1), latencyMs: lat?.toFixed(1), tempC: tmp?.toFixed(1), batteryMa: telemetry.battery },
      },
      optimizations: logs.filter(l => l.message.includes('AI ENGINE') || l.message.includes('CODE HEALER')).map(l => l.message),
      anomalies: logs.filter(l => l.message.includes('CRITICAL')).map(l => `[${l.time}] ${l.message}`),
      verdict: deployScore >= 80 ? 'DEPLOY READY' : deployScore >= 50 ? 'OPTIMIZATION NEEDED' : 'NOT SAFE TO DEPLOY'
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `npu-trace-report-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Live HUD' },
    { id: 'history', icon: History, label: 'Trace History' },
    { id: 'terminal', icon: Terminal, label: 'AI Build Logs' },
    { id: 'settings', icon: Settings, label: 'Hardware Config' },
  ];

  return (
    <div className="h-screen w-screen flex font-sans antialiased overflow-hidden text-[#ededed] bg-transparent relative">
      
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 md:top-20 md:right-8 z-[100] flex flex-col gap-3 max-w-[90vw]">
        <AnimatePresence>
          {alerts.map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`border px-4 py-3 flex items-center gap-3 glitch-btn ${
                alert.type === 'success' 
                  ? 'bg-[#121c08] border-[#34d399] text-[#34d399] shadow-[0_0_20px_rgba(52,211,153,0.4)]' 
                  : 'bg-[#1a0505] border-red-600 text-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)]'
              }`}
            >
              {alert.type === 'success' ? <Cpu className="w-5 h-5 animate-pulse shrink-0" /> : <AlertTriangle className="w-5 h-5 animate-pulse shrink-0" />}
              <span className="font-mono text-xs font-bold tracking-wider uppercase">{alert.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar Navigation */}
      <aside className={`fixed lg:relative w-64 h-full bg-[#050505]/95 backdrop-blur-md flex flex-col z-40 border-r border-[#222] transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6 border-b border-[#222] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#FBBF24] to-[#d97706] flex items-center justify-center rounded-sm glitch-btn shadow-[0_0_15px_rgba(251,191,36,0.4)]">
              <Activity className="w-5 h-5 text-black" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic leading-none drop-shadow-md">
                NPU TRACE
              </h1>
              <span className="text-[10px] font-bold tracking-[0.3em] text-[#FBBF24] uppercase mt-1">
                AI Optimizer
              </span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[#888] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 py-8 flex flex-col gap-2 px-4">
          <span className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2 ml-2">System Ops</span>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setCurrentView(item.id); setSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 text-sm font-bold uppercase tracking-wider ${
                currentView === item.id 
                  ? 'bg-[#FBBF24]/10 border-l-4 border-[#FBBF24] text-[#FBBF24]' 
                  : 'text-[#888] hover:text-white hover:bg-[#111] border-l-4 border-transparent'
              }`}
            >
              <item.icon className={`w-4 h-4`} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-6 border-t border-[#222] mt-auto bg-[#0a0a0c] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#888] uppercase">Uplink {status}</span>
            <div className={`w-2 h-2 rounded-sm ${status === 'Connected' ? 'bg-[#FBBF24] shadow-[0_0_8px_#FBBF24]' : 'bg-red-500'}`}></div>
          </div>
          
          <div className="pt-4 border-t border-[#222] flex flex-col gap-3">
            <span className="text-[9px] font-bold text-[#666] uppercase tracking-widest text-center">
              iQOO Hackathon
            </span>
            <span className="text-xs font-black text-white uppercase tracking-widest text-center italic">
              Abhijeet Kangane
            </span>
            <div className="flex items-center justify-center gap-4 text-[#666] mt-1">
              <a href="https://github.com/abhi666-max" target="_blank" rel="noopener noreferrer" className="hover:text-[#FBBF24] transition-colors duration-200"><FaGithub className="w-4 h-4" /></a>
              <a href="https://www.linkedin.com/in/abhijeet-kangane/" target="_blank" rel="noopener noreferrer" className="hover:text-[#FBBF24] transition-colors duration-200"><FaLinkedin className="w-4 h-4" /></a>
              <a href="http://x.com/abhijeet_037" target="_blank" rel="noopener noreferrer" className="hover:text-[#FBBF24] transition-colors duration-200"><FaTwitter className="w-4 h-4" /></a>
              <a href="https://www.instagram.com/abhijeet.037/" target="_blank" rel="noopener noreferrer" className="hover:text-[#FBBF24] transition-colors duration-200"><FaInstagram className="w-4 h-4" /></a>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden bg-transparent">
        
        {/* Top Header Bar */}
        <header className="h-[60px] lg:h-[73px] border-b border-[#222] bg-[#050505]/90 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#888] hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xs lg:text-sm font-mono font-bold text-[#888] uppercase tracking-widest">
              {navItems.find(i => i.id === currentView)?.label}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-5">
            <button 
              onClick={triggerStressTest}
              className="glitch-btn hidden md:flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-white text-black px-6 py-2.5 hover:bg-[#ccc] transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              SIMULATE RAW AI WORKLOAD
            </button>
            <button onClick={exportReport} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/30 px-3 lg:px-4 py-2 hover:bg-[#FBBF24]/20 transition-colors">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">EXPORT REPORT</span>
            </button>
          </div>
        </header>

        {/* View Container - scrollable on mobile, fixed on desktop */}
        <div className="flex-1 overflow-y-auto lg:overflow-hidden p-3 lg:p-6 flex flex-col">
          
          <AnimatePresence mode="wait">
            
            {/* 1. DASHBOARD VIEW */}
            {currentView === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="max-w-[1600px] mx-auto w-full h-full flex flex-col gap-4"
                >
                {/* Top Row: Metrics + Deploy Score */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 shrink-0">
                  <div className="col-span-2 lg:col-span-2">
                    <ChartCard title="NPU Grid Load" icon={Activity} color={IQOO_GOLD} value={telemetry.npu[telemetry.npu.length - 1]} unit="%" data={telemetry.npu} />
                  </div>
                  <ChartCard title="Token Latency" icon={Zap} color="#34d399" value={telemetry.latency[telemetry.latency.length - 1]} unit="ms" data={telemetry.latency} />
                  <ChartCard title="Chip Temp" icon={Thermometer} color={telemetry.temp[telemetry.temp.length - 1] > 80 ? IQOO_RED : '#f97316'} value={telemetry.temp[telemetry.temp.length - 1]} unit="°C" data={telemetry.temp} />
                  
                  {/* Deploy Readiness Score */}
                  <div className="hud-panel p-4 lg:p-5 flex flex-col items-center justify-center h-[160px] shrink-0 col-span-2 lg:col-span-1">
                    <h2 className="text-[10px] font-bold text-[#888] uppercase tracking-[0.15em] flex items-center gap-1 mb-2">
                      <Shield className="w-3.5 h-3.5" style={{color: deployScore >= 80 ? '#34d399' : deployScore >= 50 ? '#FBBF24' : '#DC2626'}} /> Deploy Score
                    </h2>
                    <div className="relative w-20 h-20 lg:w-24 lg:h-24">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#222" strokeWidth="6" />
                        <circle cx="50" cy="50" r="42" fill="none" 
                          stroke={deployScore >= 80 ? '#34d399' : deployScore >= 50 ? '#FBBF24' : '#DC2626'}
                          strokeWidth="6" strokeLinecap="round" strokeDasharray={`${deployScore * 2.64} 264`}
                          style={{filter: `drop-shadow(0 0 6px ${deployScore >= 80 ? '#34d399' : deployScore >= 50 ? '#FBBF24' : '#DC2626'})`}}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-mono text-2xl lg:text-3xl font-black" style={{color: deployScore >= 80 ? '#34d399' : deployScore >= 50 ? '#FBBF24' : '#DC2626'}}>{deployScore}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest mt-2"
                      style={{color: deployScore >= 80 ? '#34d399' : deployScore >= 50 ? '#FBBF24' : '#DC2626'}}>
                      {deployScore >= 80 ? 'DEPLOY READY' : deployScore >= 50 ? 'NEEDS OPT' : 'NOT SAFE'}
                    </span>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 flex-1 min-h-[250px] lg:min-h-0">
                  
                  {/* Radar Analysis */}
                  <div className="hud-panel p-6 flex flex-col lg:col-span-1">
                    <h2 className="text-[11px] font-bold text-[#888] uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                      <Activity className="w-4 h-4 text-[#FBBF24]" /> Tactical Radar
                    </h2>
                    <div className="flex-1 relative flex items-center justify-center">
                      <Radar 
                        data={{
                          labels: ['Load', 'Temp', 'Latency', 'Battery', 'IOPS'],
                          datasets: [{
                            label: 'Envelope',
                            data: [
                              telemetry.npu[telemetry.npu.length - 1],
                              telemetry.temp[telemetry.temp.length - 1],
                              Math.min(100, telemetry.latency[telemetry.latency.length - 1] * 2),
                              Math.min(100, telemetry.battery / 20),
                              75
                            ],
                            backgroundColor: 'rgba(251, 191, 36, 0.2)',
                            borderColor: '#FBBF24',
                            borderWidth: 2,
                            pointBackgroundColor: '#FBBF24',
                            pointBorderColor: '#fff',
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: '#FBBF24'
                          }]
                        }}
                        options={{
                          responsive: true, maintainAspectRatio: false,
                          scales: {
                            r: {
                              angleLines: { color: 'rgba(251, 191, 36, 0.2)' },
                              grid: { color: 'rgba(251, 191, 36, 0.2)' },
                              pointLabels: { color: '#FBBF24', font: { family: 'monospace', size: 10, weight: 'bold' } },
                              ticks: { display: false, max: 100, min: 0 }
                            }
                          },
                          plugins: { legend: { display: false } }
                        }}
                      />
                    </div>
                  </div>

                  {/* Execution Stream (Mini) */}
                  <div className="hud-panel p-0 lg:col-span-2 flex flex-col scanlines">
                    <div className="px-5 py-4 border-b border-[#222] bg-[#0a0a0c] z-10 flex items-center justify-between">
                      <h2 className="text-[11px] font-bold text-[#888] uppercase tracking-[0.2em] flex items-center gap-2">
                        <List className="w-4 h-4 text-[#FBBF24]" /> Watchdog Auto-Optimizer
                      </h2>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 border"
                        style={activeProfile === 'ECO' ? {borderColor:'#34d399',color:'#34d399'} : activeProfile === 'PERFORMANCE' ? {borderColor:'#DC2626',color:'#DC2626'} : {borderColor:'#FBBF24',color:'#FBBF24'}}>
                        {activeProfile} PROFILE
                      </span>
                    </div>
                    <div className="p-5 flex-1 relative bg-[#050505] z-10">
                      <div className="absolute inset-5 overflow-y-auto font-mono text-xs leading-relaxed space-y-2 pr-3 custom-scrollbar flex flex-col">
                        {logs.length === 0 ? (
                          <div className="flex flex-col gap-3 mt-auto">
                            <div className="text-[#444] font-bold animate-pulse">Monitoring /target_builds for AI model drops...</div>
                            <div className="text-[#333] text-[10px]">Drop a <span className="text-[#FBBF24]/60">.pt / .onnx</span> file → Auto-Quantize to INT8</div>
                            <div className="text-[#333] text-[10px]">Drop a <span className="text-red-900">.py</span> file → AI Code Healer scan</div>
                          </div>
                        ) : (
                          logs.slice(-20).map((log) => (
                            <div key={log.id} className="flex items-start gap-3 py-1 border-b border-[#111] last:border-0 hover:bg-[#111] px-2">
                              <span className="text-[#666] shrink-0 font-bold">[{log.time}]</span> 
                              <span className={`break-words ${log.message.includes('AI ENGINE') ? 'text-[#FBBF24] font-black' : log.message.includes('AI CODE HEALER') ? 'text-[#34d399]' : 'text-[#ccc]'}`}>{log.message}</span>
                            </div>
                          ))
                        )}
                        <div ref={logsEndRef} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. HISTORY VIEW */}
            {currentView === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-[1600px] mx-auto w-full h-full flex flex-col"
              >
                <div className="hud-panel flex-1 flex flex-col overflow-hidden bg-[#050505]">
                  <div className="px-6 py-5 border-b border-[#222] flex items-center justify-between">
                    <h2 className="text-[11px] font-bold text-[#888] uppercase tracking-[0.2em] flex items-center gap-2">
                      <History className="w-4 h-4 text-[#FBBF24]" /> Telemetry Database
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-[#666]">Last sync: {lastRefresh.toLocaleTimeString('en-US', { hour12: false })}</span>
                      <span className="text-xs font-mono font-bold text-[#34d399] flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#34d399] animate-pulse rounded-sm"></div> LIVE
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar p-0">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#0a0a0c]">
                        <tr className="border-b border-[#222] text-[10px] uppercase tracking-widest text-[#666] font-black">
                          <th className="py-4 px-6">ID</th>
                          <th className="py-4 px-6">Timestamp</th>
                          <th className="py-4 px-6">NPU Load</th>
                          <th className="py-4 px-6">Latency</th>
                          <th className="py-4 px-6">Temperature</th>
                          <th className="py-4 px-6">Battery</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-xs font-bold text-[#aaa]">
                        {historyData.length === 0 && <tr><td colSpan="6" className="py-8 text-center text-[#666]">No records found.</td></tr>}
                        {historyData.map(row => (
                          <tr key={row.id} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                            <td className="py-3 px-6 text-[#666]">#{row.id}</td>
                            <td className="py-3 px-6 text-[#888]">{new Date(row.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</td>
                            <td className="py-3 px-6 text-[#FBBF24]">{row.npu_load_pct}%</td>
                            <td className="py-3 px-6 text-[#34d399]">{row.token_latency_ms}ms</td>
                            <td className={`py-3 px-6 ${row.chip_temp_celsius > 80 ? 'text-red-500 bg-[#330000]' : 'text-orange-400'}`}>{row.chip_temp_celsius}°C</td>
                            <td className="py-3 px-6">{row.battery_drain_ma} mA</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. TERMINAL VIEW */}
            {currentView === 'terminal' && (
              <motion.div 
                key="terminal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-[1600px] mx-auto w-full h-full flex flex-col"
              >
                <div className="hud-panel flex-1 flex flex-col bg-[#050505] scanlines">
                  <div className="px-5 py-3 border-b border-[#222] flex items-center gap-3 bg-[#0a0a0c] z-10">
                    <span className="text-xs font-mono font-bold text-[#888] uppercase">root@nputrace-autoopt:~#</span>
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar p-6 font-mono text-xs leading-relaxed text-[#FBBF24] z-10 font-bold shadow-[inset_0_0_50px_rgba(251,191,36,0.1)]">
                    <div className="mb-4 text-[#888]">
                      NPU Trace AI Optimizer Engine v8.0<br/>
                      Tracking Watchdog events in /target_builds...<br/>
                      =================================================<br/>
                    </div>
                    {logs.map((log) => (
                      <div key={log.id} className="flex gap-4 hover:bg-[#111] px-2 py-1">
                        <span className="text-[#666] shrink-0">[{log.time}]</span>
                        <span className={log.message.includes('AI ENGINE') ? 'text-white bg-[#FBBF24]/20 px-1' : log.message.includes('CRITICAL') || log.message.includes('Failed') ? 'text-red-500' : ''}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                    
                    {codeFix && (
                      <div className="mt-6 border border-red-900 bg-[#1a0505] p-4 relative glitch-btn shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                        <h4 className="text-red-500 font-bold mb-3 flex items-center gap-2 uppercase tracking-widest text-xs">
                          <AlertTriangle className="w-4 h-4 animate-pulse" /> 
                          AI Code Healer: Memory Leak Detected in {codeFix.file}
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4 font-mono text-[10px]">
                          <div className="border border-[#333] bg-[#000]">
                            <div className="bg-[#220000] text-red-400 px-2 py-1 border-b border-[#333] font-bold">Old Code (Slow)</div>
                            <pre className="p-2 text-[#888]">def process_tensor():<br/>    print('Processing...')<br/>    # No garbage collection<br/>    return True</pre>
                          </div>
                          <div className="border border-[#333] bg-[#000]">
                            <div className="bg-[#002200] text-[#34d399] px-2 py-1 border-b border-[#333] font-bold">AI Suggested Fix (Fast)</div>
                            <pre className="p-2 text-[#34d399]">import gc<br/>def process_tensor():<br/>    print('Processing...')<br/>    gc.collect() # Fix</pre>
                          </div>
                        </div>

                        <button 
                          onClick={applyAiFix}
                          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 uppercase tracking-widest text-xs transition-colors"
                        >
                          Apply AI Fix
                        </button>
                      </div>
                    )}

                    <div className="flex gap-4 mt-2 px-2">
                      <span className="text-[#666]">[{new Date().toLocaleTimeString('en-US', { hour12: false })}]</span>
                      <span className="animate-pulse bg-[#FBBF24] text-black px-1">_</span>
                    </div>
                    <div ref={terminalEndRef} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. HARDWARE CONFIG VIEW */}
            {currentView === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex flex-col gap-4"
              >
                {/* Header */}
                <div className="hud-panel p-5 shrink-0 flex items-center justify-between">
                  <div>
                    <h2 className="text-[11px] font-bold text-[#888] uppercase tracking-[0.2em] flex items-center gap-2">
                      <Settings className="w-4 h-4 text-[#FBBF24]" /> NPU Hardware Profile Manager
                    </h2>
                    <p className="text-xs text-[#666] mt-1 font-mono">Select a deployment profile to reconfigure NPU clock speeds, voltage rails, and thermal limits in real-time.</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold border px-4 py-2"
                    style={activeProfile === 'ECO' ? {borderColor:'#34d399', color:'#34d399', background:'rgba(52,211,153,0.1)'} : activeProfile === 'PERFORMANCE' ? {borderColor:'#DC2626', color:'#DC2626', background:'rgba(220,38,38,0.1)'} : {borderColor:'#FBBF24', color:'#FBBF24', background:'rgba(251,191,36,0.1)'}}>
                    <div className="w-2 h-2 rounded-sm animate-pulse" style={{background: activeProfile === 'ECO' ? '#34d399' : activeProfile === 'PERFORMANCE' ? '#DC2626' : '#FBBF24'}}></div>
                    ACTIVE: {activeProfile}
                  </div>
                </div>

                {/* Profile Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
                  
                  {/* ECO MODE */}
                  <button onClick={() => setProfile('ECO')} className={`hud-panel p-6 flex flex-col text-left transition-all duration-300 hover:scale-[1.01] ${activeProfile === 'ECO' ? 'border-[#34d399] shadow-[0_0_30px_rgba(52,211,153,0.3)]' : 'border-[#222] hover:border-[#34d399]/50'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-sm flex items-center justify-center text-2xl" style={{background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.4)'}}>🌿</div>
                      {activeProfile === 'ECO' && <span className="text-[9px] font-black text-[#34d399] border border-[#34d399] px-2 py-1 uppercase tracking-widest animate-pulse">ACTIVE</span>}
                    </div>
                    <h3 className="text-xl font-black text-[#34d399] uppercase tracking-wider mb-1">ECO MODE</h3>
                    <p className="text-xs text-[#666] font-mono mb-6">Maximum battery efficiency. Ideal for background AI inference with minimal thermal impact.</p>
                    <div className="mt-auto space-y-3 font-mono text-xs">
                      <div className="flex justify-between"><span className="text-[#666]">NPU Clock</span><span className="text-[#34d399] font-black">LOW (10%)</span></div>
                      <div className="flex justify-between"><span className="text-[#666]">Token Latency</span><span className="text-[#34d399] font-black">~45ms</span></div>
                      <div className="flex justify-between"><span className="text-[#666]">Chip Temp</span><span className="text-[#34d399] font-black">35°C</span></div>
                      <div className="flex justify-between"><span className="text-[#666]">Battery Draw</span><span className="text-[#34d399] font-black">500 mA</span></div>
                    </div>
                  </button>

                  {/* BALANCED MODE */}
                  <button onClick={() => setProfile('BALANCED')} className={`hud-panel p-6 flex flex-col text-left transition-all duration-300 hover:scale-[1.01] ${activeProfile === 'BALANCED' ? 'border-[#FBBF24] shadow-[0_0_30px_rgba(251,191,36,0.3)]' : 'border-[#222] hover:border-[#FBBF24]/50'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-sm flex items-center justify-center text-2xl" style={{background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.4)'}}>⚡</div>
                      {activeProfile === 'BALANCED' && <span className="text-[9px] font-black text-[#FBBF24] border border-[#FBBF24] px-2 py-1 uppercase tracking-widest animate-pulse">ACTIVE</span>}
                    </div>
                    <h3 className="text-xl font-black text-[#FBBF24] uppercase tracking-wider mb-1">BALANCED</h3>
                    <p className="text-xs text-[#666] font-mono mb-6">Standard deployment config. Optimal balance between inference speed and device longevity.</p>
                    <div className="mt-auto space-y-3 font-mono text-xs">
                      <div className="flex justify-between"><span className="text-[#666]">NPU Clock</span><span className="text-[#FBBF24] font-black">MED (50%)</span></div>
                      <div className="flex justify-between"><span className="text-[#666]">Token Latency</span><span className="text-[#FBBF24] font-black">~12ms</span></div>
                      <div className="flex justify-between"><span className="text-[#666]">Chip Temp</span><span className="text-[#FBBF24] font-black">45°C</span></div>
                      <div className="flex justify-between"><span className="text-[#666]">Battery Draw</span><span className="text-[#FBBF24] font-black">1200 mA</span></div>
                    </div>
                  </button>

                  {/* PERFORMANCE MODE */}
                  <button onClick={() => setProfile('PERFORMANCE')} className={`hud-panel p-6 flex flex-col text-left transition-all duration-300 hover:scale-[1.01] ${activeProfile === 'PERFORMANCE' ? 'border-[#DC2626] shadow-[0_0_30px_rgba(220,38,38,0.4)]' : 'border-[#222] hover:border-[#DC2626]/50'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-sm flex items-center justify-center text-2xl" style={{background:'rgba(220,38,38,0.15)', border:'1px solid rgba(220,38,38,0.4)'}}>🔥</div>
                      {activeProfile === 'PERFORMANCE' && <span className="text-[9px] font-black text-red-500 border border-red-500 px-2 py-1 uppercase tracking-widest animate-pulse">ACTIVE</span>}
                    </div>
                    <h3 className="text-xl font-black text-red-500 uppercase tracking-wider mb-1">PERFORMANCE</h3>
                    <p className="text-xs text-[#666] font-mono mb-6">NPU overclocked to maximum. Extreme low-latency AI inference for real-time gaming applications.</p>
                    <div className="mt-auto space-y-3 font-mono text-xs">
                      <div className="flex justify-between"><span className="text-[#666]">NPU Clock</span><span className="text-red-400 font-black">MAX (100%)</span></div>
                      <div className="flex justify-between"><span className="text-[#666]">Token Latency</span><span className="text-red-400 font-black">~2ms 🏆</span></div>
                      <div className="flex justify-between"><span className="text-[#666]">Chip Temp</span><span className="text-red-400 font-black">75°C ⚠️</span></div>
                      <div className="flex justify-between"><span className="text-[#666]">Battery Draw</span><span className="text-red-400 font-black">3500 mA 🔥</span></div>
                    </div>
                  </button>

                </div>

                {/* Warning Bar */}
                <div className="hud-panel px-5 py-3 shrink-0 border-[#333] flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-[#FBBF24] shrink-0" />
                  <p className="text-[10px] font-mono text-[#666] uppercase tracking-widest">
                    Profile changes are applied immediately to the connected NPU hardware. Monitor Live HUD for real-time metric changes.
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
