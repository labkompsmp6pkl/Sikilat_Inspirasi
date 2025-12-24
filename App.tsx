
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
  Activity, 
  Database,
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
  const isSyncingProfile = useRef(false);

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

  const syncUserProfile = async (authId: string, email: string) => {
    if (isSyncingProfile.current) return;
    isSyncingProfile.current = true;
    try {
        let profile = await db.getUserProfile(authId);
        if (!profile) {
            const fixProfile: Pengguna = {
                id_pengguna: authId,
                nama_lengkap: email.split('@')[0],
                email: email,
                no_hp: '-',
                peran: 'tamu',
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authId}`
            };
            await db.createUserProfile(fixProfile);
            profile = fixProfile;
        }
        setCurrentUser(profile);
        refreshAllData();
    } finally {
        isSyncingProfile.current = false;
        setIsAppLoading(false);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            await syncUserProfile(session.user.id, session.user.email!);
        } else {
            setIsAppLoading(false);
        }
    };
    initializeAuth();
    
    window.addEventListener('SIKILAT_SYNC_COMPLETE', refreshAllData);
    return () => window.removeEventListener('SIKILAT_SYNC_COMPLETE', refreshAllData);
  }, [refreshAllData]);

  const resetAppState = () => {
    setCurrentUser(null); 
    setBookings([]); 
    setReports([]); 
    setIsChatOpen(false);
  };

  const handleAiConclusion = async () => {
      if (!currentUser) return;
      setIsAnalyzing(true);
      setAiConclusion(null);
      const conclusion = await generateGlobalConclusion({ reports, bookings, activities, inventaris }, currentUser);
      setAiConclusion(conclusion);
      setIsAnalyzing(false);
  };

  const handleLogout = async () => {
    resetAppState();
    await supabase.auth.signOut();
  };

  // --- DATABASE UPDATE HANDLERS ---
  const handleUpdateBooking = async (id: string, status: 'Disetujui' | 'Ditolak') => {
      await db.updateStatus('peminjaman_antrian', id, 'id_peminjaman', { status_peminjaman: status });
  };

  const handleUpdateAgenda = async (id: string, status: 'Disetujui' | 'Ditolak', reason?: string) => {
      await db.updateStatus('agenda_kegiatan', id, 'id', { status, alasan_penolakan: reason });
  };

  const handleProcessTicket = async (id: string) => {
      await db.updateStatus('pengaduan_kerusakan', id, 'id', { status: 'Proses' });
  };

  if (isAppLoading) return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0f172a] text-white">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
          <h1 className="text-3xl font-black italic">SIKILAT NODE ACTIVE</h1>
      </div>
  );

  if (!currentUser) return <Login onLoginSuccess={setCurrentUser} />;

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col relative font-inter overflow-x-hidden">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/95 backdrop-blur-2xl border-b border-slate-200 z-[100] shadow-xl flex items-center px-6 md:px-10">
          <div className="max-w-[1800px] w-full mx-auto flex justify-between items-center">
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-950 rounded-[1.25rem] flex items-center justify-center text-white font-black">S</div>
                  <div className="flex flex-col">
                      <span className="font-black text-slate-900 text-xl md:text-2xl tracking-tighter italic">SIKILAT</span>
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                          <Activity className="w-3 h-3" /> System Live
                      </span>
                  </div>
              </div>
              
              <div className="flex items-center gap-4">
                  {isAdminRole && (
                    <button onClick={() => setIsSqlEditorOpen(true)} className="hidden sm:flex items-center gap-3 px-5 py-2.5 bg-slate-900 text-white rounded-2xl">
                      <Terminal className="w-4 h-4 text-indigo-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest">SQL Console</span>
                    </button>
                  )}
                  
                  <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="relative flex items-center gap-3 p-1.5 bg-white border border-slate-100 rounded-full">
                      <img src={currentUser.avatar} className="w-10 h-10 rounded-full border-2 border-slate-100 object-cover" alt="avatar"/>
                      <div className="text-left hidden md:block pr-4">
                          <p className="text-xs font-black text-slate-900 leading-none mb-1">{currentUser.nama_lengkap}</p>
                          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{currentUser.peran.replace('_',' ')}</p>
                      </div>
                      
                      {isProfileMenuOpen && (
                          <div className="absolute right-0 top-16 w-64 bg-white rounded-3xl shadow-4xl border border-slate-100 py-4 animate-slide-up z-[110]">
                              <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 mb-3">
                                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Account</p>
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
            
            {/* HERO & AI CONCLUSION */}
            <div className="bg-[#0f172a] rounded-[3rem] p-10 md:p-20 shadow-3xl text-white relative overflow-hidden">
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    <div className="lg:col-span-7">
                        <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-indigo-500/10 rounded-full text-[11px] font-black uppercase tracking-[0.3em] mb-10 border border-indigo-500/20 text-indigo-300">
                            <BrainCircuit className="w-5 h-5" /> Strategic Intelligence v3.0
                        </div>
                        <h2 className="text-4xl md:text-7xl font-black mb-10 tracking-tighter italic leading-tight">Pantau aset kilat, kendalikan masa depan.</h2>
                        <button onClick={handleAiConclusion} disabled={isAnalyzing} className="group flex items-center gap-5 bg-indigo-600 text-white px-8 py-5 md:py-7 rounded-[2.5rem] font-black text-sm md:text-base hover:bg-indigo-500 transition-all shadow-2xl active:scale-95">
                            {isAnalyzing ? <Loader2 className="w-7 h-7 animate-spin" /> : <Sparkles className="w-7 h-7" />}
                            GENERATE AI CONCLUSION
                        </button>
                    </div>
                    <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                        <div className="p-8 bg-slate-900/50 rounded-[3rem] border border-white/5 text-center">
                            <p className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Pending Tickets</p>
                            <p className="text-4xl md:text-6xl font-black tabular-nums">{reports.filter(r => r.status === 'Pending').length}</p>
                        </div>
                        <div className="p-8 bg-indigo-600/10 rounded-[3rem] border border-indigo-500/10 text-center">
                            <p className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Cloud Docs Sync</p>
                            <p className="text-4xl md:text-6xl font-black tabular-nums">{cloudDocCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI RESULT BOX */}
            {(aiConclusion || isAnalyzing) && (
                <div className="bg-white rounded-[4rem] p-10 md:p-16 shadow-2xl relative animate-slide-up border border-indigo-100">
                    <button onClick={() => setAiConclusion(null)} className="absolute top-10 right-10 p-3 hover:bg-slate-100 rounded-full">
                        <X className="w-6 h-6 text-slate-400"/>
                    </button>
                    <div className="flex items-center gap-6 mb-10">
                        <div className="p-5 bg-slate-950 text-white rounded-[1.5rem]">
                            {isAnalyzing ? <Loader2 className="w-8 h-8 animate-spin" /> : <BrainCircuit className="w-8 h-8" />}
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight italic">AI Executive Intelligence</h3>
                    </div>
                    <div className="prose prose-indigo max-w-none text-slate-800 text-lg leading-relaxed whitespace-pre-wrap font-medium bg-slate-50/50 p-10 rounded-[3rem] border border-slate-100">
                        {isAnalyzing ? "Menganalisis performa infrastruktur sekolah..." : aiConclusion}
                    </div>
                </div>
            )}

            {/* WIDGET GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
                <div className="xl:col-span-3 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <BookingTable 
                            bookings={bookings} 
                            currentUserRole={currentUser.peran} 
                            onUpdateStatus={handleUpdateBooking} 
                        />
                        <AgendaActivityTable 
                            activities={activities} 
                            currentUserRole={currentUser.peran} 
                            onUpdateStatus={handleUpdateAgenda} 
                        />
                    </div>
                    <PendingTicketTable 
                        reports={reports} 
                        onProcessAction={async (prompt) => {
                            // Extract ID from prompt if needed, or trigger AI process
                            const idMatch = prompt.match(/laporan\s(\S+)/);
                            if (idMatch) await handleProcessTicket(idMatch[1]);
                            setExternalMessage(prompt); 
                            setIsChatOpen(true); 
                        }} 
                    />
                </div>
                <div className="xl:col-span-1 space-y-12">
                     <MyStatusDashboard 
                        currentUser={currentUser} 
                        reports={reports} 
                        bookings={bookings} 
                        activities={activities} 
                     />
                     <DamageReportChart 
                        reports={reports} 
                        onProcessAction={m => { setExternalMessage(m); setIsChatOpen(true); }} 
                        isReadOnly={currentUser.peran !== 'admin'} 
                     />
                </div>
            </div>
        </div>
      </main>

      {/* SQL & CHAT UI */}
      <SQLEditor isOpen={isSqlEditorOpen} onClose={() => setIsSqlEditorOpen(false)} />
      <div className={`fixed bottom-0 right-0 z-[120] p-6 md:p-10 transition-all duration-500 ${isChatOpen ? 'w-full max-w-2xl' : 'w-auto'}`}>
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
              <button onClick={() => setIsChatOpen(true)} className="group bg-slate-950 text-white p-6 md:p-8 rounded-[3rem] shadow-4xl flex items-center gap-6 border-4 border-white hover:bg-indigo-600 transition-all">
                  <MessageCircle className="w-8 h-8 md:w-9 md:h-9" />
                  <span className="font-black text-lg tracking-tight pr-4 italic">SIKILAT AI ASSISTANT</span>
              </button>
          )}
      </div>

      {/* SAVED NOTIFICATION */}
      {showSavedNotification && (
        <div className="fixed bottom-36 right-10 bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl animate-fade-in-up flex items-center gap-5 border-4 border-white z-[200]">
            <CheckCircle2 className="w-8 h-8" />
            <div>
                <p className="text-sm font-black italic">Cloud Synchronized!</p>
                <p className="text-[9px] font-black opacity-80 uppercase tracking-widest">Document Saved to Supabase Node</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
