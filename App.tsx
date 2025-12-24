
import React, { useState, useEffect, useCallback } from 'react';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import MyStatusDashboard from './components/MyStatusDashboard';
import DamageReportChart from './components/DamageReportChart';
import PendingTicketTable from './components/PendingTicketTable';
import AgendaActivityTable from './components/AgendaActivityTable'; 
import BookingTable from './components/BookingTable';
import SQLEditor from './components/SQLEditor'; // Impor baru
import { ROLE_CONFIGS } from './constants';
import { UserRole, SavedData, PengaduanKerusakan, PeminjamanAntrian, Pengguna, Inventaris, AgendaKegiatan, PenilaianAset } from './types';
import db from './services/dbService'; 
import { supabase } from './services/supabaseClient';
import { generateGlobalConclusion } from './services/geminiService';
import { 
  LogOut, 
  CheckCircle2, 
  MessageCircle, 
  Loader2, 
  Sparkles, 
  BrainCircuit, 
  X, 
  FileText, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  Activity, 
  Info, 
  BarChart3, 
  Database,
  Clock,
  LayoutDashboard,
  ChevronRight,
  Terminal // Icon baru
} from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Pengguna | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [isSyncingGlobal, setIsSyncingGlobal] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); 
  const [isSqlEditorOpen, setIsSqlEditorOpen] = useState(false); // State baru
  const [externalMessage, setExternalMessage] = useState<string | null>(null);
  const [cloudDocCount, setCloudDocCount] = useState(0);

  const [bookings, setBookings] = useState<PeminjamanAntrian[]>([]);
  const [reports, setReports] = useState<PengaduanKerusakan[]>([]);
  const [evaluations, setEvaluations] = useState<PenilaianAset[]>([]);
  const [inventaris, setInventaris] = useState<Inventaris[]>([]);
  const [activities, setActivities] = useState<AgendaKegiatan[]>([]); 
  
  const [aiConclusion, setAiConclusion] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isAdminRole = currentUser && ['admin', 'pengawas_admin', 'pengawas_it'].includes(currentUser.peran);

  const refreshAllData = useCallback(async () => {
    setIsSyncingGlobal(true);
    try {
        const [b, r, e, i, a] = await Promise.all([
            db.getTable('peminjaman_antrian'),
            db.getTable('pengaduan_kerusakan'),
            db.getTable('penilaian_aset'),
            db.getTable('inventaris'),
            db.getTable('agenda_kegiatan')
        ]);
        setBookings(b); 
        setReports(r); 
        setEvaluations(e); 
        setInventaris(i); 
        setActivities(a);
        setCloudDocCount(b.length + r.length + e.length + i.length + a.length);
    } catch (e) { 
        console.error(e); 
    } finally { 
        setIsSyncingGlobal(false); 
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const profile = await db.getUserProfile(session.user.id);
                if (profile) { 
                    setCurrentUser(profile); 
                    await refreshAllData(); 
                }
            }
        } catch (e) { 
            console.error(e); 
        } finally { 
            setIsAppLoading(false);
        }
    };
    initializeAuth();
    
    window.addEventListener('SIKILAT_SYNC_COMPLETE', refreshAllData);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            const profile = await db.getUserProfile(session.user.id);
            if (profile) { 
                setCurrentUser(profile); 
                await refreshAllData(); 
            }
        } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null); 
            setBookings([]); 
            setReports([]); 
            setIsChatOpen(false);
            setIsSqlEditorOpen(false);
        }
    });
    return () => {
        subscription.unsubscribe();
        window.removeEventListener('SIKILAT_SYNC_COMPLETE', refreshAllData);
    };
  }, [refreshAllData]);

  const handleAiConclusion = async () => {
      if (!currentUser) return;
      setIsAnalyzing(true);
      setAiConclusion(null);
      const conclusion = await generateGlobalConclusion({ reports, bookings, activities, inventaris }, currentUser);
      setAiConclusion(conclusion);
      setIsAnalyzing(false);
  };

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    await supabase.auth.signOut();
  };

  if (isAppLoading) return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0f172a] text-white">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-8 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-indigo-400 animate-pulse" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter italic animate-pulse">SIKILAT</h1>
          <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.5em] mt-4 opacity-50">Secure Sync Initialization</p>
      </div>
  );

  if (!currentUser) return <Login onLoginSuccess={setCurrentUser} />;

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col relative font-inter">
      {/* GLOBAL HEADER */}
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/95 backdrop-blur-2xl border-b border-slate-200 z-[100] shadow-xl shadow-slate-900/5 flex items-center px-6 md:px-10">
          <div className="max-w-[1800px] w-full mx-auto flex justify-between items-center">
              <div className="flex items-center gap-4 md:gap-5">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-950 rounded-[1.25rem] flex items-center justify-center text-white font-black shadow-2xl shadow-slate-300 rotate-6 group hover:rotate-0 transition-transform cursor-pointer">S</div>
                  <div className="flex flex-col">
                      <span className="font-black text-slate-900 text-xl md:text-2xl tracking-tighter italic leading-none">SIKILAT</span>
                      <span className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                          <Activity className="w-3 h-3" /> Node Active
                      </span>
                  </div>
              </div>
              
              <div className="flex items-center gap-4 md:gap-8">
                  {/* SQL EDITOR BUTTON - Admin Only */}
                  {isAdminRole && (
                    <button 
                      onClick={() => setIsSqlEditorOpen(true)}
                      className="hidden sm:flex items-center gap-3 px-5 py-2.5 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl shadow-slate-900/20 hover:bg-black transition-all group"
                    >
                      <Terminal className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">SQL Console</span>
                    </button>
                  )}

                  <div className="hidden lg:flex items-center gap-4 px-5 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                      <div className="relative">
                          <Database className="w-5 h-5 text-indigo-500" />
                          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1 tracking-widest">Global Node</span>
                          <span className="text-xs font-black text-slate-800 leading-none">SUPABASE CONNECTED</span>
                      </div>
                  </div>
                  
                  <div className="hidden md:block h-12 w-px bg-slate-200"></div>
                  
                  <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="relative flex items-center gap-3 md:gap-4 p-2 pr-3 md:pr-6 rounded-[1.5rem] bg-white border border-slate-100 hover:bg-slate-50 transition-all shadow-lg shadow-slate-900/5">
                      <div className="relative">
                        <img src={currentUser.avatar} className="w-9 h-9 md:w-11 md:h-11 rounded-2xl border-2 border-slate-100 shadow-sm object-cover" alt="avatar"/>
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></span>
                      </div>
                      <div className="text-left hidden sm:block">
                          <p className="text-sm font-black text-slate-900 leading-none mb-1.5">{currentUser.nama_lengkap}</p>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                            {currentUser.peran.replace('_',' ')}
                          </p>
                      </div>
                      {isProfileMenuOpen && (
                          <div className="absolute right-0 top-16 w-64 bg-white rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] border border-slate-100 py-4 animate-slide-up overflow-hidden z-[110]">
                              <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 mb-3">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Logged In Account</p>
                                  <p className="text-xs font-bold text-slate-700 truncate">{currentUser.email}</p>
                              </div>
                              <button onClick={handleLogout} className="w-full text-left flex items-center gap-4 px-6 py-4 text-xs text-rose-600 font-black hover:bg-rose-50 transition-all">
                                  <LogOut className="w-5 h-5"/> Putus Koneksi
                              </button>
                          </div>
                      )}
                  </button>
              </div>
          </div>
      </header>

      {/* DASHBOARD CONTENT */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto p-6 md:p-10 pt-36 pb-32">
        <div className="space-y-12">
            
            {/* HERO WELCOME */}
            <div className="bg-[#0f172a] rounded-[3rem] md:rounded-[4rem] p-10 md:p-20 shadow-3xl text-white relative overflow-hidden">
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-16 items-center">
                    <div className="lg:col-span-7">
                        <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-indigo-500/10 rounded-full text-[11px] font-black uppercase tracking-[0.3em] mb-10 border border-indigo-500/20 backdrop-blur-xl text-indigo-300">
                            <BrainCircuit className="w-5 h-5" /> Strategic Intelligence v3.0
                        </div>
                        <h2 className="text-4xl md:text-7xl font-black mb-10 tracking-tighter italic leading-tight">Pantau aset kilat, kendalikan masa depan.</h2>
                        <p className="text-slate-400 text-lg md:text-2xl leading-relaxed mb-12 max-w-2xl font-medium">
                            Solusi manajemen infrastruktur sekolah berbasis AI. Dapatkan laporan strategis dalam hitungan detik.
                        </p>
                        
                        <div className="flex flex-wrap gap-4 md:gap-6">
                            <button 
                                onClick={handleAiConclusion}
                                disabled={isAnalyzing}
                                className="group flex items-center gap-4 md:gap-5 bg-indigo-600 text-white px-8 md:px-12 py-5 md:py-7 rounded-[2.5rem] font-black text-sm md:text-base hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-900/40 active:scale-95 disabled:opacity-50"
                            >
                                {isAnalyzing ? <Loader2 className="w-7 h-7 animate-spin" /> : <Sparkles className="w-7 h-7 group-hover:scale-125 transition-transform" />}
                                GENERATE CONCLUSION
                            </button>
                            {isAdminRole && (
                              <button onClick={() => setIsSqlEditorOpen(true)} className="flex items-center gap-4 md:gap-5 bg-indigo-500/10 text-white px-8 md:px-12 py-5 md:py-7 rounded-[2.5rem] font-black text-sm md:text-base hover:bg-indigo-500/20 transition-all border border-indigo-500/20 active:scale-95 shadow-xl">
                                  <Database className="w-7 h-7" /> DATABASE EXPLORER
                              </button>
                            )}
                            {['guru', 'tamu'].includes(currentUser.peran) && (
                                <button onClick={() => { setExternalMessage("Saya ingin lapor kerusakan aset."); setIsChatOpen(true); }} className="flex items-center gap-4 md:gap-5 bg-white/5 backdrop-blur-3xl text-white px-8 md:px-12 py-5 md:py-7 rounded-[2.5rem] font-black text-sm md:text-base hover:bg-white/10 transition-all border border-white/10 active:scale-95 shadow-xl">
                                    <MessageCircle className="w-7 h-7" /> LAPOR KERUSAKAN
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="lg:col-span-5 grid grid-cols-2 gap-4 md:gap-8">
                        <div className="p-8 md:p-10 bg-slate-900/50 rounded-[3rem] border border-white/5 backdrop-blur-md flex flex-col items-center justify-center text-center group hover:border-indigo-500/30 transition-colors">
                            <p className="text-[10px] md:text-[11px] font-black uppercase text-slate-500 mb-2 tracking-widest">Pending</p>
                            <p className="text-4xl md:text-6xl font-black tabular-nums tracking-tighter">{reports.filter(r => r.status === 'Pending').length}</p>
                        </div>
                        <div className="p-8 md:p-10 bg-indigo-600/10 rounded-[3rem] border border-indigo-500/10 backdrop-blur-md flex flex-col items-center justify-center text-center group hover:border-indigo-500/50 transition-colors">
                            <p className="text-[10px] md:text-[11px] font-black uppercase text-slate-500 mb-2 tracking-widest">Docs Sync</p>
                            <p className="text-4xl md:text-6xl font-black tabular-nums tracking-tighter">{cloudDocCount}</p>
                        </div>
                    </div>
                </div>
                {/* Background Decor */}
                <div className="absolute top-[-40%] right-[-10%] w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[180px] opacity-40"></div>
            </div>

            {/* AI CONCLUSION SECTION */}
            {(aiConclusion || isAnalyzing) && (
                <div className="bg-white rounded-[4rem] p-10 md:p-16 shadow-2xl relative animate-slide-up border border-indigo-100 overflow-hidden">
                    <button onClick={() => setAiConclusion(null)} className="absolute top-10 right-10 p-3 hover:bg-slate-100 rounded-full transition-all z-20">
                        <X className="w-6 h-6 text-slate-400"/>
                    </button>
                    
                    <div className="flex items-center gap-6 mb-10">
                        <div className="p-5 bg-slate-950 text-white rounded-[1.5rem] shadow-xl">
                            {isAnalyzing ? <Loader2 className="w-8 h-8 animate-spin" /> : <BrainCircuit className="w-8 h-8" />}
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight italic">Executive Intelligence</h3>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">AI Strategic Summary</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        <div className="lg:col-span-8">
                             {isAnalyzing ? (
                                 <div className="space-y-6 animate-pulse">
                                     <div className="h-10 bg-slate-100 rounded-2xl w-2/3"></div>
                                     <div className="h-6 bg-slate-100 rounded-full w-full"></div>
                                     <div className="h-6 bg-slate-100 rounded-full w-5/6"></div>
                                     <div className="h-48 bg-slate-50 rounded-[3rem] w-full mt-10"></div>
                                 </div>
                             ) : (
                                <div className="prose prose-indigo max-w-none text-slate-800 text-lg leading-relaxed whitespace-pre-wrap font-medium bg-slate-50/50 p-10 rounded-[3rem] border border-slate-100 shadow-inner">
                                    {aiConclusion}
                                </div>
                             )}
                        </div>
                        <div className="lg:col-span-4 space-y-8">
                            <div className="bg-[#0f172a] rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl">
                                <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-indigo-400">
                                    <TrendingUp className="w-4 h-4" /> Real-time Analytics
                                </h4>
                                <div className="space-y-6 relative z-10">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-xs">
                                            <p className="font-bold italic">Health Index</p>
                                            <span className="text-emerald-400 font-black">94%</span>
                                        </div>
                                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500" style={{ width: '94%' }}></div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-xs">
                                            <p className="font-bold italic">Response Time</p>
                                            <span className="text-indigo-400 font-black">-15%</span>
                                        </div>
                                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500" style={{ width: '70%' }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-[-20%] left-[-20%] w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                            </div>
                            
                            <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100 flex items-start gap-4">
                                <Info className="w-5 h-5 text-indigo-600 mt-1" />
                                <p className="text-xs text-indigo-900 font-bold leading-relaxed">
                                    Analisis ini dihitung berdasarkan {reports.length} laporan kerusakan dan {bookings.length} antrian booking terbaru.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN DASHBOARD MODULES */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-10 md:gap-12">
                <div className="xl:col-span-3 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <BookingTable 
                            bookings={bookings} 
                            currentUserRole={currentUser.peran} 
                            onUpdateStatus={async (id, s) => {
                                const target = bookings.find(b => b.id_peminjaman === id);
                                if (target) await db.addRecord('peminjaman_antrian', { ...target, status_peminjaman: s });
                            }} 
                        />
                        <AgendaActivityTable 
                            activities={activities} 
                            currentUserRole={currentUser.peran} 
                            onUpdateStatus={async (id, s) => {
                                const target = activities.find(a => a.id === id);
                                if (target) await db.addRecord('agenda_kegiatan', { ...target, status: s });
                            }} 
                        />
                    </div>
                    <PendingTicketTable 
                        reports={reports} 
                        onProcessAction={m => { setExternalMessage(m); setIsChatOpen(true); }} 
                    />
                </div>
                <div className="xl:col-span-1 space-y-12">
                     <MyStatusDashboard currentUser={currentUser} reports={reports} bookings={bookings} activities={activities} />
                     <DamageReportChart 
                        reports={reports} 
                        onProcessAction={m => { setExternalMessage(m); setIsChatOpen(true); }} 
                        isReadOnly={currentUser.peran !== 'admin'} 
                     />
                </div>
            </div>
        </div>
      </main>

      {/* MODALS & OVERLAYS */}
      <SQLEditor isOpen={isSqlEditorOpen} onClose={() => setIsSqlEditorOpen(false)} />

      {/* AI CHAT BUTTON & INTERFACE */}
      <div className={`fixed bottom-0 right-0 z-[120] p-6 md:p-10 transition-all duration-500 ease-in-out ${isChatOpen ? 'w-full max-w-2xl' : 'w-auto'}`}>
          {isChatOpen ? (
              <div className="h-[750px] md:h-[820px] shadow-4xl animate-slide-up rounded-[2.5rem] md:rounded-[3rem] overflow-hidden border-4 border-white bg-white">
                  <ChatInterface 
                    user={currentUser} 
                    roleConfig={ROLE_CONFIGS[currentUser.peran]} 
                    onDataSaved={async d => { 
                        await db.addRecord(d.table, d.payload); 
                        setShowSavedNotification(true); 
                        setTimeout(() => setShowSavedNotification(false), 3000); 
                    }} 
                    stats={reports.filter(r => r.status === 'Pending').length} 
                    isOpen={isChatOpen} 
                    onToggle={() => setIsChatOpen(false)} 
                    externalMessage={externalMessage}
                    onClearExternalMessage={() => setExternalMessage(null)}
                  />
              </div>
          ) : (
              <button onClick={() => setIsChatOpen(true)} className="group bg-slate-950 text-white p-6 md:p-7 rounded-[2.5rem] md:rounded-[3rem] shadow-4xl flex items-center gap-4 md:gap-6 border-4 border-white hover:bg-indigo-600 hover:scale-105 transition-all active:scale-95">
                  <div className="relative">
                      <MessageCircle className="w-8 h-8 md:w-9 md:h-9" />
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-[3px] border-slate-950 animate-pulse"></span>
                  </div>
                  <span className="font-black text-base md:text-lg tracking-tight pr-4 italic">SIKILAT AI ASSISTANT</span>
              </button>
          )}
      </div>

      {/* SYNC NOTIFICATION */}
      {showSavedNotification && (
        <div className="fixed bottom-36 right-10 bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl animate-fade-in-up flex items-center gap-5 border-4 border-white z-[200]">
            <CheckCircle2 className="w-8 h-8" />
            <div>
                <p className="text-sm font-black italic">Cloud Synchronized!</p>
                <p className="text-[9px] font-black text-emerald-100 uppercase tracking-widest opacity-80">Document Saved Successfully</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
