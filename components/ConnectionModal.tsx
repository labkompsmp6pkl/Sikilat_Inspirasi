
import React, { useState, useEffect } from 'react';
import { X, Server, Key, Globe, Database, ArrowRight, CheckCircle2, Copy, ExternalLink, ShieldCheck, Download, Activity, Clock, Zap, RefreshCw, HelpCircle } from 'lucide-react';
import db from '../services/dbService';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(4); // Start at Status since config is default
  const [config, setConfig] = useState({
    endpoint: 'couchbases://cb.0inyiwf3vrtiq9kj.cloud.couchbase.com',
    user: 'labkom1',
    pass: 'Kartinispensix@36'
  });
  const [isSaved, setIsSaved] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    const saved = db.getCloudConfig();
    if (saved) {
      setConfig(saved);
      setIsSaved(true);
      setLogs(db.getSyncLogs());
    }
  }, [isOpen]);

  const handleSave = () => {
    db.connectToCloud(config);
    setIsSaved(true);
    setStep(4);
    setLogs(db.getSyncLogs());
  };

  const handleBulkSync = async () => {
      setIsSyncing(true);
      setSyncProgress(0);
      await db.syncAllToCloud((p, msg) => {
          setSyncProgress(p);
          setSyncMsg(msg);
      });
      setIsSyncing(false);
      setLogs(db.getSyncLogs());
  };

  const handleExport = () => {
    db.exportForCouchbase();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-slide-up">
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">SIKILAT Connectivity</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Couchbase Capella Node</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-[500px]">
          {/* Sidebar */}
          <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-100 p-6 space-y-3">
            {[
              { id: 4, label: 'Sync Center', icon: Zap },
              { id: 1, label: 'IP Settings', icon: Globe },
              { id: 2, label: 'Credentials', icon: Key },
              { id: 5, label: 'Activity Logs', icon: Activity },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  step === s.id 
                  ? 'bg-white shadow-md text-indigo-600 border border-indigo-100 scale-105' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
              >
                <s.icon className={`w-4 h-4 ${step === s.id ? 'opacity-100' : 'opacity-50'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
              </button>
            ))}
            
            <div className="mt-auto pt-6">
                <div className="p-4 bg-indigo-600 rounded-2xl text-white">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Active User</p>
                    <p className="text-xs font-bold truncate">labkom1 (Admin)</p>
                </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
            {step === 4 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <h4 className="text-lg font-black text-slate-800">Sync Dashboard</h4>
                        <p className="text-xs text-slate-500">Kirim data lokal ke Capella Cloud</p>
                    </div>
                    <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-200">
                        Online
                    </div>
                </div>

                {isSyncing ? (
                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 text-center space-y-4">
                        <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
                        <div>
                            <p className="text-sm font-black text-slate-800">{syncProgress}% Synced</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{syncMsg}</p>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${syncProgress}%` }}></div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        <button 
                            onClick={handleBulkSync}
                            className="group flex items-center justify-between p-5 bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-[1.5rem] shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-all"
                        >
                            <div className="text-left">
                                <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70">Action</p>
                                <p className="text-base font-black">Sync All Data Now</p>
                            </div>
                            <Zap className="w-8 h-8 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </button>

                        <button 
                            onClick={handleExport}
                            className="flex items-center justify-between p-5 bg-white border-2 border-slate-100 rounded-[1.5rem] hover:border-indigo-200 hover:shadow-md transition-all group"
                        >
                            <div className="text-left">
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Database</p>
                                <p className="text-base font-black text-slate-800">Export for Capella</p>
                            </div>
                            <Download className="w-6 h-6 text-slate-300 group-hover:text-indigo-600" />
                        </button>
                    </div>
                )}

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                    <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                        <p className="text-[11px] font-black text-amber-800 uppercase tracking-widest mb-1">Penting!</p>
                        <p className="text-[10px] text-amber-700 leading-relaxed">
                            Agar jumlah dokumen di Capella bertambah, klik <strong>"Export"</strong>, lalu buka tab <strong>"Import"</strong> di panel Capella Anda dan unggah file JSON tersebut.
                        </p>
                    </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6 animate-fade-in h-full flex flex-col">
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-slate-800">Activity Logs</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time PUSH monitoring</p>
                </div>
                
                <div className="flex-1 bg-slate-900 rounded-[2rem] p-5 overflow-y-auto font-mono text-[10px] border border-slate-800 space-y-3 shadow-inner">
                    {logs.length > 0 ? logs.map((log, idx) => (
                        <div key={idx} className="border-l-2 border-indigo-500 pl-4 py-1 animate-fade-in-up">
                            <div className="flex items-center gap-2 text-indigo-400 font-bold mb-1">
                                <Clock className="w-3 h-3" />
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </div>
                            <p className="text-slate-300 leading-relaxed">
                                <span className="text-emerald-400 font-black tracking-widest">OK</span> &nbsp; {log.message}
                            </p>
                        </div>
                    )) : (
                        <div className="h-full flex items-center justify-center text-slate-600 italic">
                            No recent activity found.
                        </div>
                    )}
                </div>
              </div>
            )}

            {/* Config steps remain for reference but with default values */}
            {(step === 1 || step === 2) && (
                 <div className="space-y-6 animate-fade-in">
                    <h4 className="text-lg font-black text-slate-800">{step === 1 ? 'Network Access' : 'Cloud Credentials'}</h4>
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                        {step === 1 ? (
                            <p className="text-sm text-slate-500">Hubungkan browser Anda ke cluster <strong>{config.endpoint}</strong> dengan mendaftarkan IP Anda di Couchbase console.</p>
                        ) : (
                            <>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Username</label>
                                    <input type="text" readOnly value={config.user} className="w-full bg-white border border-slate-200 p-3 rounded-xl font-bold text-sm" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Password</label>
                                    <input type="password" readOnly value={config.pass} className="w-full bg-white border border-slate-200 p-3 rounded-xl font-bold text-sm" />
                                </div>
                            </>
                        )}
                    </div>
                    <button onClick={() => setStep(4)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm transition-all hover:bg-indigo-600">
                        Back to Dashboard
                    </button>
                 </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionModal;
