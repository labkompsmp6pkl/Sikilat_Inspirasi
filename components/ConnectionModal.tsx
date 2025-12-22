
import React, { useState, useEffect } from 'react';
import { X, Server, Key, Globe, Database, ArrowRight, CheckCircle2, Copy, ExternalLink, ShieldCheck, Download, Activity, Clock } from 'lucide-react';
import db from '../services/dbService';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    endpoint: 'couchbases://cb.0inyiwf3vrtiq9kj.cloud.couchbase.com',
    user: 'labkom1',
    pass: 'Kartinispensix@36'
  });
  const [isSaved, setIsSaved] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

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
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Connectivity Center</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cloud Sync & Database Config</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isSaved && (
                 <button 
                    onClick={() => setStep(5)}
                    className={`p-2 rounded-xl transition-all ${step === 5 ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
                    title="Lihat Log Aktivitas"
                 >
                    <Activity className="w-5 h-5" />
                 </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row h-[480px]">
          {/* Sidebar Steps */}
          <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-100 p-6 space-y-4">
            {[
              { id: 1, label: 'IP Whitelist', icon: Globe },
              { id: 2, label: 'Credentials', icon: Key },
              { id: 3, label: 'Endpoint', icon: Server },
              { id: 4, label: 'Sync Status', icon: ShieldCheck },
              { id: 5, label: 'Live Logs', icon: Activity },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  step === s.id 
                  ? 'bg-white shadow-md text-indigo-600 border border-indigo-100' 
                  : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <s.icon className={`w-4 h-4 ${step === s.id ? 'opacity-100' : 'opacity-50'}`} />
                <span className="text-xs font-black uppercase tracking-widest">{s.label}</span>
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <h4 className="text-lg font-black text-slate-800">1. Atur Allowed IP Address</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Sebelum menghubungkan, Anda harus mendaftarkan IP Anda di panel <strong>Couchbase Capella</strong> agar akses tidak diblokir.
                  </p>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                  <ExternalLink className="w-5 h-5 text-amber-600 mt-1" />
                  <p className="text-xs text-amber-800 font-medium">
                    Buka tab <strong>"Allowed IP Addresses"</strong> di cluster Capella Anda dan tambahkan IP saat ini.
                  </p>
                </div>
                <button onClick={() => setStep(2)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all">
                  Lanjut ke Kredensial <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <h4 className="text-lg font-black text-slate-800">2. Database Credentials</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Masukkan kredensial yang Anda buat di menu <strong>"Cluster Access"</strong>.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DB Username</label>
                    <input 
                      type="text" 
                      value={config.user}
                      onChange={(e) => setConfig({...config, user: e.target.value})}
                      placeholder="Contoh: admin_sikilat"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DB Password</label>
                    <input 
                      type="password" 
                      value={config.pass}
                      onChange={(e) => setConfig({...config, pass: e.target.value})}
                      placeholder="••••••••"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm"
                    />
                  </div>
                </div>
                <button onClick={() => setStep(3)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all">
                  Lanjut ke Endpoint <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <h4 className="text-lg font-black text-slate-800">3. Connection String</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Salin <strong>Public Connection String</strong> dari tab "Connect" di Capella.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endpoint URI</label>
                  <textarea 
                    value={config.endpoint}
                    onChange={(e) => setConfig({...config, endpoint: e.target.value})}
                    placeholder="couchbases://cb.your-cluster-id.cloud.couchbase.com"
                    className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-mono text-xs font-bold"
                  />
                </div>
                <button onClick={handleSave} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">
                  Hubungkan Sekarang <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 animate-fade-in text-center py-4">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-black text-slate-800">Konfigurasi Tersimpan</h4>
                  <p className="text-sm text-slate-500 px-6">
                    Aplikasi siap melakukan sinkronisasi dengan cluster Capella Anda.
                  </p>
                </div>

                <div className="pt-6 grid grid-cols-1 gap-3">
                   <button 
                    onClick={handleExport}
                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-white hover:shadow-md transition-all group"
                   >
                     <div className="text-left">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Ekspor Data Lokal</p>
                        <p className="text-[10px] text-slate-400 font-bold">Unduh file .json untuk Import Capella</p>
                     </div>
                     <Download className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                   </button>
                   
                   <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-[10px] font-black uppercase tracking-widest justify-center">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      Cloud Tunnel Active
                   </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6 animate-fade-in h-full flex flex-col">
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-slate-800">Cloud Sync Activity</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Memantau Record Data Terupdate</p>
                </div>
                
                <div className="flex-1 bg-slate-900 rounded-3xl p-4 overflow-y-auto font-mono text-[10px] border border-slate-800 space-y-3">
                    {logs.length > 0 ? logs.map((log, idx) => (
                        <div key={idx} className="border-l-2 border-indigo-500 pl-3 py-1 animate-fade-in">
                            <div className="flex items-center gap-2 text-indigo-400 font-bold mb-1">
                                <Clock className="w-3 h-3" />
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </div>
                            <p className="text-slate-300 leading-relaxed break-all">
                                <span className="text-emerald-400">SUCCESS:</span> {log.message}
                            </p>
                        </div>
                    )) : (
                        <div className="h-full flex items-center justify-center text-slate-500 italic">
                            Belum ada aktivitas record terdeteksi.
                        </div>
                    )}
                </div>
                <p className="text-[9px] text-slate-400 text-center italic">Sinkronisasi berjalan secara background setiap kali Anda menyimpan data.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionModal;
