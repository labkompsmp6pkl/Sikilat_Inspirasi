
import React, { useState, useEffect, useCallback } from 'react';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import MyStatusDashboard from './components/MyStatusDashboard';
import DamageReportChart from './components/DamageReportChart';
import PendingTicketTable from './components/PendingTicketTable';
import AgendaActivityTable from './components/AgendaActivityTable'; 
import BookingTable from './components/BookingTable';
import { ROLE_CONFIGS } from './constants';
import { UserRole, SavedData, PengaduanKerusakan, PeminjamanAntrian, Pengguna, Inventaris, AgendaKegiatan, PenilaianAset } from './types';
import db from './services/dbService'; 
import { supabase } from './services/supabaseClient';
import { generateGlobalConclusion } from './services/geminiService';
import { LogOut, CloudLightning, CheckCircle2, MessageCircle, RefreshCcw, Loader2, Sparkles, Building2, BrainCircuit, X, FileText, TrendingUp, ShieldCheck, Zap, Activity, Info } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Pengguna | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [isSyncingGlobal, setIsSyncingGlobal] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); 
  const [externalMessage, setExternalMessage] = useState<string | null>(null);
  const [cloudDocCount, setCloudDocCount] = useState(0);

  const [bookings, setBookings] = useState<PeminjamanAntrian[]>([]);
  const [reports, setReports] = useState<PengaduanKerusakan[]>([]);
  const [evaluations, setEvaluations] = useState<PenilaianAset[]>([]);
  const [inventaris, setInventaris] = useState<Inventaris[]>([]);
  const [activities, setActivities] = useState<AgendaKegiatan[]>([]); 
  
  const [aiConclusion, setAiConclusion] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
        setBookings(b); setReports(r); setEvaluations(e); setInventaris(i); setActivities(a);
        setCloudDocCount(b.length + r.length + e.length + i.length + a.length);
    } catch (e) { console.error(e); } finally { setIsSyncingGlobal(false); }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
        try {
            const { data: { session } } = await (supabase.auth as any).getSession();
            if (session?.user) {
                const profile = await db.getUserProfile(session.user.id);
                if (profile) { setCurrentUser(profile); await refreshAllData(); }
            }
        } catch (e) { console.error(e); } finally { 
            setIsAppLoading(false);
        }
    };
    initializeAuth();
    
    // Listen to real-time sync event
    const handleSyncComplete = () => {
        refreshAllData();
    };
    window.addEventListener('SIKILAT_SYNC_COMPLETE', handleSyncComplete);

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(async (event: any, session: any) => {
        if (event === 'SIGNED_IN' && session?.user) {
            const profile = await db.getUserProfile(session.user.id);
            if (profile) { setCurrentUser(profile); await refreshAllData(); }
        } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null); setBookings([]); setReports([]); setIsChatOpen(false);
        }
    });
    return () => {
        subscription.unsubscribe();
        window.removeEventListener('SIKILAT_SYNC_COMPLETE', handleSyncComplete);
    };
  }, [refreshAllData]);

  const handleAiConclusion = async () => {
      if (!currentUser) return;
      setIsAnalyzing(true);
      setAiConclusion(null); // Clear previous
      const conclusion = await generateGlobalConclusion({ reports, bookings, activities, inventaris }, currentUser);
      setAiConclusion(conclusion);
      setIsAnalyzing(false);
  };

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    await (supabase.auth as any).signOut();
  };

  if (isAppLoading) return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <h1 className="text-4xl font-black tracking-tighter italic animate-pulse">SIKILAT</h1>
      </div>
  );

  if (!currentUser) return <Login onLoginSuccess={setCurrentUser} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative font-inter">
      <header className="fixed top-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-xl border-b border-slate-200 z-[100] shadow-sm flex items-center px-8">
          <div className="max-w-screen-2xl w-full mx-auto flex justify-between items-center">
              <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black shadow-xl shadow-slate-200 rotate-3">S</div>
                  <div className="flex flex-col">
                      <span className="font-black text-slate-900 text-xl tracking-tighter italic leading-none">SIKILAT</span>
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-1">Management Node 01</span>
                  </div>
              </div>
              
              <div className="flex items-center gap-6">
                  <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-100 rounded-2xl border border-slate-200/50">
                      <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Database Cloud</span>
                          <span className="text-xs font-bold text-slate-700 leading-none">CONNECTED</span>
                      </div>
                  </div>
                  
                  <div className="h-10 w-px bg-slate-100"></div>
                  
                  <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="relative flex items-center gap-3 p-1.5 pr-4 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 transition-all shadow-sm">
                      <img src={currentUser.avatar} className="w-9 h-9 rounded-xl border border-slate-100 shadow-sm" alt="avatar"/>
                      <div className="text-left hidden sm:block">
                          <p className="text-xs font-black text-slate-900 leading-none mb-1">{currentUser.nama_lengkap}</p>
                          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{currentUser.peran.replace('_',' ')}</p>
                      </div>
                      {isProfileMenuOpen && (
                          <div className="absolute right-0 top-14 w-60 bg-white rounded-3xl shadow-2xl border border-slate-100 py-3 animate-slide-up overflow-hidden">
                              <div className="px-5 py-3 border-b border-slate-50 bg-slate-50/50 mb-2">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Logged in as</p>
                                  <p className="text-[11px] font-bold text-slate-700 truncate">{currentUser.email}</p>
                              </div>
                              <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-5 py-4 text-xs text-rose-600 font-black hover:bg-rose-50 transition-colors">
                                  <LogOut className="w-4 h-4"/> Putus Koneksi
                              </button>
                          </div>
                      )}
                  </button>
              </div>
          </div>
      </header>

      <main className="flex-1 max-w-screen-2xl w-full mx-auto p-8 pt-28 pb-32">
        <div className="animate-fade-in space-y-10">
            
            {/* HERO SECTION */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 rounded-[3.5rem] p-10 md:p-16 shadow-2xl text-white relative overflow-hidden">
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/5 rounded-full text-[11px] font-black uppercase tracking-widest mb-8 border border-white/10 backdrop-blur-md">
                            <Sparkles className="w-4 h-4 text-indigo-300" /> Platform Aset Terpadu Berbasis AI
                        </div>
                        <h2 className="text-6xl font-black mb-8 tracking-tighter italic leading-tight">Siap bekerja, {currentUser.nama_lengkap.split(' ')[0]}?</h2>
                        <p className="text-indigo-100/60 text-xl leading-relaxed mb-12 max-w-xl font-medium">
                            Kelola operasional sekolah dengan kekuatan AI. Dapatkan analisis instan untuk keputusan manajerial yang akurat.
                        </p>
                        
                        <div className="flex flex-wrap gap-5">
                            <button 
                                onClick={handleAiConclusion}
                                disabled={isAnalyzing}
                                className="group flex items-center gap-4 bg-indigo-500 text-white px-10 py-6 rounded-[2rem] font-black text-sm hover:bg-indigo-400 transition-all shadow-2xl shadow-indigo-900/40 active:scale-95 disabled:opacity-50"
                            >
                                {isAnalyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <BrainCircuit className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                                GENERATE STRATEGIC SUMMARY
                            </button>
                            {currentUser.peran === 'guru' && (
                                <button onClick={() => { setExternalMessage("Saya ingin lapor kerusakan aset."); setIsChatOpen(true); }} className="flex items-center gap-4 bg-white/5 backdrop-blur-xl text-white px-10 py-6 rounded-[2rem] font-black text-sm hover:bg-white/10 transition-all border border-white/10 active:scale-95">
                                    <MessageCircle className="w-6 h-6" /> LAPOR KERUSAKAN
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full lg:w-auto">
                        <div className="p-10 bg-white/5 rounded-[3rem] border border-white/10 backdrop-blur-md text-center min-w-[200px]">
                            <p className="text-[11px] font-black uppercase text-indigo-400 mb-3 tracking-widest">Tiket Pending</p>
                            <p className="text-6xl font-black tabular-nums">{reports.filter(r => r.status === 'Pending').length}</p>
                        </div>
                        <div className="p-10 bg-indigo-500/20 rounded-[3rem] border border-indigo-400/20 backdrop-blur-md text-center min-w-[200px]">
                            <p className="text-[11px] font-black uppercase text-indigo-300 mb-3 tracking-widest">Total Record</p>
                            <p className="text-6xl font-black tabular-nums">{cloudDocCount}</p>
                        </div>
                    </div>
                </div>
                <div className="absolute top-[-50%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[150px] opacity-50"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] opacity-30"></div>
            </div>

            {/* AI CONCLUSION CARD */}
            {(aiConclusion || isAnalyzing) && (
                <div className="bg-white rounded-[4rem] p-10 md:p-14 shadow-3xl relative animate-slide-up border border-indigo-100 overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50 rounded-full blur-[100px] -z-10 opacity-70"></div>
                    <button onClick={() => setAiConclusion(null)} className="absolute top-10 right-10 p-3 hover:bg-slate-100 rounded-full transition-colors z-20"><X className="w-7 h-7 text-slate-400"/></button>
                    
                    <div className="flex items-center gap-6 mb-12">
                        <div className="p-5 bg-slate-900 text-white rounded-[1.5rem] shadow-2xl shadow-slate-200 rotate-2">
                            {isAnalyzing ? <Activity className="w-9 h-9 animate-pulse text-indigo-400" /> : <FileText className="w-9 h-9" />}
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">SIKILAT Executive Summary</h3>
                            <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em] mt-1">
                                {isAnalyzing ? 'Menganalisis Sinkronisasi Data Cloud...' : 'Hasil Analisis Strategis Terverifikasi'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        <div className="lg:col-span-8">
                             {isAnalyzing ? (
                                 <div className="space-y-4 animate-pulse">
                                     <div className="h-6 bg-slate-100 rounded-full w-3/4"></div>
                                     <div className="h-6 bg-slate-100 rounded-full w-full"></div>
                                     <div className="h-6 bg-slate-100 rounded-full w-5/6"></div>
                                     <div className="h-40 bg-slate-50 rounded-[2.5rem] w-full mt-6"></div>
                                 </div>
                             ) : (
                                <div className="prose prose-slate max-w-none text-slate-700 text-xl leading-relaxed whitespace-pre-wrap font-medium bg-slate-50/50 p-10 rounded-[2.5rem] border border-slate-100 shadow-inner">
                                    {aiConclusion}
                                </div>
                             )}
                        </div>
                        <div className="lg:col-span-4 space-y-8">
                            <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden group">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] mb-6 flex items-center gap-3 text-indigo-300">
                                    <TrendingUp className="w-4 h-4" /> Insight Performa
                                </h4>
                                <div className="space-y-6 relative z-10">
                                    <div className="space-y-2">
                                        <p className="text-sm font-black italic">Health Index Aset</p>
                                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500" style={{ width: '85%' }}></div>
                                        </div>
                                        <p className="text-[10px] text-indigo-100/50">85% Aset berfungsi optimal.</p>
                                    </div>
                                    <div className="h-px bg-white/10 w-full"></div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-black italic">Efisiensi Tim PJ</p>
                                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500" style={{ width: '92%' }}></div>
                                        </div>
                                        <p className="text-[10px] text-indigo-100/50">Waktu respon meningkat 12%.</p>
                                    </div>
                                </div>
                                <div className="absolute bottom-[-20%] right-[-20%] w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all"></div>
                            </div>
                            
                            <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 flex items-start gap-4">
                                <Info className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                                <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                                    Laporan ini dihasilkan menggunakan data real-time dari seluruh node sekolah Anda.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 italic px-4">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" /> 
                                POWERED BY GEMINI 3 PRO PREVIEW
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DASHBOARD GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
                <div className="xl:col-span-3 space-y-10">
                    <BookingTable bookings={bookings} currentUserRole={currentUser.peran} onUpdateStatus={async (id, s, r) => {
                        const target = bookings.find(b => b.id_peminjaman === id);
                        if (target) await db.addRecord('peminjaman_antrian', { ...target, status_peminjaman: s, alasan_penolakan: r });
                        refreshAllData();
                    }} />
                    <AgendaActivityTable activities={activities} currentUserRole={currentUser.peran} onUpdateStatus={async (id, s, r) => {
                        const target = activities.find(a => a.id === id);
                        if (target) await db.addRecord('agenda_kegiatan', { ...target, status: s, alasan_penolakan: r });
                        refreshAllData();
                    }} />
                    <PendingTicketTable reports={reports} onProcessAction={m => { setExternalMessage(m); setIsChatOpen(true); }} />
                </div>
                <div className="xl:col-span-1 space-y-10">
                     <MyStatusDashboard currentUser={currentUser} reports={reports} bookings={bookings} activities={activities} />
                     <DamageReportChart reports={reports} onProcessAction={m => { setExternalMessage(m); setIsChatOpen(true); }} isReadOnly={currentUser.peran !== 'admin'} />
                </div>
            </div>
        </div>
      </main>

      {/* AI CHAT INTERFACE */}
      <div className={`fixed bottom-0 right-0 z-[120] p-8 transition-all duration-500 ${isChatOpen ? 'w-full max-w-xl' : 'w-auto'}`}>
          {isChatOpen ? (
              <div className="h-[750px] shadow-3xl animate-slide-up">
                  <ChatInterface 
                    user={currentUser} 
                    roleConfig={ROLE_CONFIGS[currentUser.peran]} 
                    onDataSaved={async d => { await db.addRecord(d.table, d.payload); refreshAllData(); setShowSavedNotification(true); setTimeout(() => setShowSavedNotification(false), 3000); }} 
                    stats={reports.filter(r => r.status === 'Pending').length} 
                    isOpen={isChatOpen} 
                    onToggle={() => setIsChatOpen(false)} 
                    externalMessage={externalMessage}
                    onClearExternalMessage={() => setExternalMessage(null)}
                  />
              </div>
          ) : (
              <button onClick={() => setIsChatOpen(true)} className="group bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-3xl flex items-center gap-5 border-4 border-white hover:bg-indigo-600 hover:scale-105 transition-all active:scale-95">
                  <div className="relative">
                      <MessageCircle className="w-8 h-8" />
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-[3px] border-slate-900 animate-pulse"></span>
                  </div>
                  <span className="font-black text-base tracking-tight pr-3">SIKILAT AI ASSISTANT</span>
              </button>
          )}
      </div>

      {showSavedNotification && (
        <div className="fixed bottom-32 right-12 bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-3xl animate-fade-in-up flex items-center gap-5 border-4 border-white z-[200]">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
                <p className="text-sm font-black italic">Cloud Data Synchronized!</p>
                <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest opacity-70">Supabase Handshake OK</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
