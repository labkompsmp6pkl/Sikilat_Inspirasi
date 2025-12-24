
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import MyStatusDashboard from './components/MyStatusDashboard';
import DamageReportChart from './components/DamageReportChart';
import PendingTicketTable from './components/PendingTicketTable';
import AgendaActivityTable from './components/AgendaActivityTable'; 
import BookingTable from './components/BookingTable';
import SQLEditor from './components/SQLEditor';
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
  Terminal 
} from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Pengguna | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [isSyncingGlobal, setIsSyncingGlobal] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); 
  const [isSqlEditorOpen, setIsSqlEditorOpen] = useState(false);
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
  const hasInitialized = useRef(false);

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
        setBookings(b || []); 
        setReports(r || []); 
        setEvaluations(e || []); 
        setInventaris(i || []); 
        setActivities(a || []);
        setCloudDocCount((b?.length || 0) + (r?.length || 0) + (e?.length || 0) + (i?.length || 0) + (a?.length || 0));
    } catch (e) { 
        console.error("Refresh Data Error:", e); 
    } finally { 
        setIsSyncingGlobal(false); 
    }
  }, []);

  useEffect(() => {
    const failsafe = setTimeout(() => {
        if (isAppLoading) {
            console.warn("SIKILAT: Initializing forced by timeout...");
            setIsAppLoading(false);
        }
    }, 6000);

    const initializeAuth = async () => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;

            if (session?.user) {
                const profile = await db.getUserProfile(session.user.id);
                if (profile) { 
                    setCurrentUser(profile); 
                    refreshAllData(); 
                }
            }
        } catch (e) { 
            console.error("Auth Init Hook Error:", e); 
        } finally { 
            setIsAppLoading(false);
            clearTimeout(failsafe);
        }
    };

    initializeAuth();
    
    window.addEventListener('SIKILAT_SYNC_COMPLETE', refreshAllData);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            const profile = await db.getUserProfile(session.user.id);
            if (profile) { 
                setCurrentUser(profile); 
                refreshAllData(); 
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
        clearTimeout(failsafe);
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
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0f172a] text-white p-6 text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-8 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-indigo-400 animate-pulse" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter italic animate-pulse mb-4">SIKILAT</h1>
          <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.5em] mb-8 opacity-50">Secure Sync Initialization</p>
          
          <div className="max-w-xs space-y-4">
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Kami sedang menyeimbangkan koneksi database. Jika sistem terhenti di sini, silakan periksa izin cookies browser Anda.
              </p>
              <button 
                onClick={() => setIsAppLoading(false)}
                className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Lewati & Masuk Manual
              </button>
          </div>
      </div>
  );

  if (!currentUser) return <Login onLoginSuccess={setCurrentUser} />;

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col relative font-inter overflow-x-hidden">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/95 backdrop-blur-2xl border-b border-slate-200 z-[100] shadow-xl shadow-slate-900/5 flex items-center px-6 md:px-10">
          <div className="max-w-[1800px] w-full mx-auto flex justify-between items-center">
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-950 rounded-[1.25rem] flex items-center justify-center text-white font-black shadow-2xl rotate-6 group hover:rotate-0 transition-transform">S</div>
                  <div className="flex flex-col">
                      <span className="font-black text-slate-900 text-xl md:text-2xl tracking-tighter italic leading-none">SIKILAT</span>
                      <span className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                          <Activity className="w-3 h-3" /> Node Active
                      </span>
                  </div>
              </div>
              
              <div className="flex items-center gap-4">
                  {isAdminRole && (
                    <button onClick={() => setIsSqlEditorOpen(true)} className="hidden sm:flex items-center gap-3 px-5 py-2.5 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl hover:bg-black transition-all group">
                      <Terminal className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">SQL Console</span>
                    </button>
                  )}
                  
                  <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="relative flex items-center gap-3 p-2 bg-white border border-slate-100 hover:bg-slate-50 transition-all rounded-full md:rounded-[1.5rem]">
                      <div className="relative">
                        <img src={currentUser.avatar} className="w-9 h-9 md:w-11 md:h-11 rounded-full md:rounded-2xl border-2 border-slate-100 object-cover" alt="avatar"/>
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></span>
                      </div>
                      <div className="text-left hidden md:block pr-4">
                          <p className="text-sm font-black text-slate-900 leading-none mb-1.5">{currentUser.nama_lengkap}</p>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{currentUser.peran.replace('_',' ')}</p>
                      </div>
                      
                      {isProfileMenuOpen && (
                          <div className="absolute right-0 top-16 w-64 bg-white rounded-[2rem] shadow-4xl border border-slate-100 py-4 animate-slide-up overflow-hidden z-[110]">
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

      {/* MAIN DASHBOARD */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto p-6 md:p-10 pt-36 pb-32">
        <div className="space-y-12">
            
            {/* HERO */}
            <div className="bg-[#0f172a] rounded-[3rem] p-10 md:p-20 shadow-3xl text-white relative overflow-hidden">
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    <div className="lg:col-span-7">
                        <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-indigo-500/10 rounded-full text-[11px] font-black uppercase tracking-[0.3em] mb-10 border border-indigo-500/20 backdrop-blur-xl text-indigo-300">
                            <BrainCircuit className="w-5 h-5" /> Strategic Intelligence v3.0
                        </div>
                        <h2 className="text-4xl md:text-7xl font-black mb-10 tracking-tighter italic leading-tight">Pantau aset kilat, kendalikan masa depan.</h2>
                        
                        <div className="flex flex-wrap gap-4">
                            <button onClick={handleAiConclusion} disabled={isAnalyzing} className="group flex items-center gap-5 bg-indigo-600 text-white px-8 py-5 md:py-7 rounded-[2.5rem] font-black text-sm md:text-base hover:bg-indigo-500 transition-all shadow-2xl active:scale-95">
                                {isAnalyzing ? <Loader2 className="w-7 h-7 animate-spin" /> : <Sparkles className="w-7 h-7 group-hover:scale-125 transition-transform" />}
                                GENERATE CONCLUSION
                            </button>
                            {isAdminRole && (
                              <button onClick={() => setIsSqlEditorOpen(true)} className="flex items-center gap-5 bg-indigo-500/10 text-white px-8 py-5 md:py-7 rounded-[2.5rem] font-black text-sm md:text-base hover:bg-indigo-500/20 transition-all border border-indigo-500/20">
                                  <Database className="w-7 h-7" /> DATABASE EXPLORER
                              </button>
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                        <div className="p-8 bg-slate-900/50 rounded-[3rem] border border-white/5 backdrop-blur-md text-center">
                            <p className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Pending</p>
                            <p className="text-4xl md:text-6xl font-black tabular-nums">{reports.filter(r => r.status === 'Pending').length}</p>
                        </div>
                        <div className="p-8 bg-indigo-600/10 rounded-[3rem] border border-indigo-500/10 backdrop-blur-md text-center">
                            <p className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Docs Sync</p>
                            <p className="text-4xl md:text-6xl font-black tabular-nums">{cloudDocCount}</p>
                        </div>
                    </div>
                </div>
                <div className="absolute top-[-40%] right-[-10%] w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[180px] opacity-40"></div>
            </div>

            {/* AI RESULT */}
            {(aiConclusion || isAnalyzing) && (
                <div className="bg-white rounded-[4rem] p-10 md:p-16 shadow-2xl relative animate-slide-up border border-indigo-100 overflow-hidden">
                    <button onClick={() => setAiConclusion(null)} className="absolute top-10 right-10 p-3 hover:bg-slate-100 rounded-full transition-all">
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
                    <div className="prose prose-indigo max-w-none text-slate-800 text-lg leading-relaxed whitespace-pre-wrap font-medium bg-slate-50/50 p-10 rounded-[3rem] border border-slate-100 shadow-inner">
                        {isAnalyzing ? "Menganalisis data ribuan aset... mohon tunggu." : aiConclusion}
                    </div>
                </div>
            )}

            {/* WIDGETS */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
                <div className="xl:col-span-3 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <BookingTable bookings={bookings} currentUserRole={currentUser.peran} onUpdateStatus={async (id, s) => {
                            const target = bookings.find(b => b.id_peminjaman === id);
                            if (target) await db.addRecord('peminjaman_antrian', { ...target, status_peminjaman: s });
                        }} />
                        <AgendaActivityTable activities={activities} currentUserRole={currentUser.peran} onUpdateStatus={async (id, s) => {
                            const target = activities.find(a => a.id === id);
                            if (target) await db.addRecord('agenda_kegiatan', { ...target, status: s });
                        }} />
                    </div>
                    <PendingTicketTable reports={reports} onProcessAction={m => { setExternalMessage(m); setIsChatOpen(true); }} />
                </div>
                <div className="xl:col-span-1 space-y-12">
                     <MyStatusDashboard currentUser={currentUser} reports={reports} bookings={bookings} activities={activities} />
                     <DamageReportChart reports={reports} onProcessAction={m => { setExternalMessage(m); setIsChatOpen(true); }} isReadOnly={currentUser.peran !== 'admin'} />
                </div>
            </div>
        </div>
      </main>

      {/* SQL MODAL */}
      <SQLEditor isOpen={isSqlEditorOpen} onClose={() => setIsSqlEditorOpen(false)} />

      {/* CHAT FAB */}
      <div className={`fixed bottom-0 right-0 z-[120] p-6 md:p-10 transition-all duration-500 ease-in-out ${isChatOpen ? 'w-full max-w-2xl' : 'w-auto'}`}>
          {isChatOpen ? (
              <div className="h-[750px] md:h-[820px] shadow-4xl animate-slide-up rounded-[3rem] overflow-hidden border-4 border-white bg-white">
                  <ChatInterface 
                    user={currentUser} roleConfig={ROLE_CONFIGS[currentUser.peran]} 
                    onDataSaved={async d => { 
                        await db.addRecord(d.table, d.payload); 
                        setShowSavedNotification(true); 
                        setTimeout(() => setShowSavedNotification(false), 3000); 
                    }} 
                    stats={reports.filter(r => r.status === 'Pending').length} 
                    isOpen={isChatOpen} onToggle={() => setIsChatOpen(false)} 
                    externalMessage={externalMessage} onClearExternalMessage={() => setExternalMessage(null)}
                  />
              </div>
          ) : (
              <button onClick={() => setIsChatOpen(true)} className="group bg-slate-950 text-white p-6 md:p-8 rounded-[3rem] shadow-4xl flex items-center gap-6 border-4 border-white hover:bg-indigo-600 hover:scale-105 transition-all">
                  <div className="relative">
                      <MessageCircle className="w-8 h-8 md:w-9 md:h-9" />
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-[3px] border-slate-950 animate-pulse"></span>
                  </div>
                  <span className="font-black text-lg tracking-tight pr-4 italic">SIKILAT AI ASSISTANT</span>
              </button>
          )}
      </div>

      {/* NOTIF */}
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
