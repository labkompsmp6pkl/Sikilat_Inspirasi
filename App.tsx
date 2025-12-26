
import React, { useState, useEffect, useCallback } from 'react';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import MyStatusDashboard from './components/MyStatusDashboard';
import DamageReportChart from './components/DamageReportChart';
import PendingTicketTable from './components/PendingTicketTable';
import AgendaActivityTable from './components/AgendaActivityTable'; 
import BookingTable from './components/BookingTable';
import SQLEditor from './components/SQLEditor';
import ConnectionModal from './components/ConnectionModal';
import { ROLE_CONFIGS, FORM_TEMPLATES } from './constants';
import { UserRole, PengaduanKerusakan, PeminjamanAntrian, Pengguna, Inventaris, AgendaKegiatan, PenilaianAset } from './types';
import db from './services/dbService'; 
import { supabase } from './services/supabaseClient';
import { generateGlobalConclusion } from './services/geminiService';
import { 
  LogOut, 
  MessageCircle, 
  Loader2, 
  Sparkles, 
  BrainCircuit, 
  X, 
  Activity, 
  Terminal,
  Cloud,
  ChevronRight,
  DatabaseZap,
  CheckCircle2,
  FileText,
  PlusCircle
} from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Pengguna | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); 
  const [isSqlEditorOpen, setIsSqlEditorOpen] = useState(false);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [externalMessage, setExternalMessage] = useState<string | null>(null);
  const [autoFormId, setAutoFormId] = useState<string | null>(null);
  const [cloudDocCount, setCloudDocCount] = useState(0);

  const [bookings, setBookings] = useState<PeminjamanAntrian[]>([]);
  const [reports, setReports] = useState<PengaduanKerusakan[]>([]);
  const [evaluations, setEvaluations] = useState<PenilaianAset[]>([]);
  const [inventaris, setInventaris] = useState<Inventaris[]>([]);
  const [activities, setActivities] = useState<AgendaKegiatan[]>([]); 
  
  const [aiConclusion, setAiConclusion] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isAdminRole = currentUser && ['admin', 'pengawas_admin', 'pengawas_it', 'pengawas_sarpras'].includes(currentUser.peran);

  const refreshAllData = useCallback(async () => {
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
    } catch (err) { 
        console.error("Refresh Error:", err);
    }
  }, []);

  // PENTING: Panggil refreshAllData segera saat currentUser tersedia (Login Sukses)
  useEffect(() => {
    if (currentUser) {
      refreshAllData();
    }
  }, [currentUser, refreshAllData]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await db.getUserProfile(session.user.id);
        if (profile) setCurrentUser(profile);
      }
      setIsAppLoading(false);
    };
    checkSession();
    
    // Listener untuk sinkronisasi otomatis dari komponen lain
    window.addEventListener('SIKILAT_SYNC_COMPLETE', refreshAllData);
    return () => window.removeEventListener('SIKILAT_SYNC_COMPLETE', refreshAllData);
  }, [refreshAllData]);

  const handleAiConclusion = async () => {
      if (!currentUser) return;
      setIsAnalyzing(true);
      setAiConclusion(null);
      const result = await generateGlobalConclusion({ reports, bookings, activities, inventaris }, currentUser);
      setAiConclusion(result);
      setIsAnalyzing(false);
  };

  const handleOpenBookingForm = () => {
      setAutoFormId('booking_ruangan');
      setIsChatOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  if (isAppLoading) return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc] text-slate-900">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
          <h1 className="text-xl font-black italic tracking-tight uppercase">Sikilat Node Starting...</h1>
      </div>
  );

  if (!currentUser) return <Login onLoginSuccess={setCurrentUser} />;

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col relative font-inter">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-[100] flex items-center px-6 md:px-10">
          <div className="max-w-[1800px] w-full mx-auto flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-lg">S</div>
                  <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-lg tracking-tight uppercase">SIKILAT</span>
                        <span className="text-[10px] font-bold text-slate-400">SMP 6 PKL</span>
                      </div>
                  </div>
              </div>
              
              <div className="flex items-center gap-6">
                  <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CAPELLA DOCS:</span>
                      <span className="text-xs font-black text-slate-900">{cloudDocCount}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-slate-900 leading-none">{currentUser.nama_lengkap}</span>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md mt-1 ${isAdminRole ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {currentUser.peran.replace('_', ' ')}
                        </span>
                    </div>
                    <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="relative group">
                        <img src={currentUser.avatar} className="w-9 h-9 rounded-full object-cover border-2 border-slate-100 group-hover:border-indigo-400 transition-all" alt="avatar"/>
                    </button>
                    {isProfileMenuOpen && (
                        <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[110]">
                            <button onClick={() => setIsConnectionModalOpen(true)} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Cloud className="w-4 h-4" /> Cloud Status</button>
                            {isAdminRole && <button onClick={() => setIsSqlEditorOpen(true)} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Terminal className="w-4 h-4" /> SQL Engine</button>}
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"><LogOut className="w-4 h-4" /> Logout</button>
                        </div>
                    )}
                  </div>
              </div>
          </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto p-6 md:p-10 pt-24 pb-24">
        <div className="flex flex-col xl:flex-row gap-8">
            <div className="flex-1 space-y-10">
                {/* AI HERO */}
                {!aiConclusion && !isAnalyzing && (
                    <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white flex justify-between items-center shadow-lg shadow-indigo-100 relative overflow-hidden group">
                        <div className="relative z-10">
                            <h2 className="text-2xl font-black italic mb-2 tracking-tight">Executive AI Analysis</h2>
                            <p className="text-indigo-100 text-xs mb-6 max-w-md font-medium">Kalkulasi performa tim dan utilisasi aset sekolah secara instan dengan Intelligence Node.</p>
                            <button onClick={handleAiConclusion} className="flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-xl font-black text-xs hover:shadow-xl transition-all active:scale-95">
                                <Sparkles className="w-4 h-4" /> GENERATE ANALYSIS
                            </button>
                        </div>
                        <BrainCircuit className="w-32 h-32 text-indigo-400/20 absolute -right-4 -bottom-4 rotate-12 group-hover:scale-110 transition-transform duration-700" />
                    </div>
                )}

                {/* CONCLUSION */}
                {(aiConclusion || isAnalyzing) && (
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 animate-slide-up relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
                         <button onClick={() => setAiConclusion(null)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all"><X className="w-4 h-4 text-slate-400"/></button>
                         <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-slate-900 text-white rounded-lg"><Sparkles className="w-5 h-5" /></div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight italic">Analisis Strategis</h3>
                         </div>
                         <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed italic">
                            {isAnalyzing ? "Mengkalkulasi data operasional..." : aiConclusion}
                         </div>
                    </div>
                )}

                <BookingTable 
                    bookings={bookings} 
                    currentUserRole={currentUser.peran} 
                    onUpdateStatus={async (id, status) => {
                        await db.updateStatus('peminjaman_antrian', id, 'id_peminjaman', { status_peminjaman: status });
                        refreshAllData();
                    }}
                    onAddBooking={handleOpenBookingForm}
                />

                <AgendaActivityTable 
                    activities={activities} 
                    currentUserRole={currentUser.peran} 
                    onUpdateStatus={async (id, status, reason) => {
                        await db.updateStatus('agenda_kegiatan', id, 'id', { status, alasan_penolakan: reason });
                        refreshAllData();
                    }} 
                />

                <PendingTicketTable 
                    reports={reports} 
                    onProcessAction={async (prompt) => {
                        const idMatch = prompt.match(/laporan\s(\S+)/);
                        if (idMatch) {
                            await db.updateStatus('pengaduan_kerusakan', idMatch[1], 'id', { status: 'Proses' });
                            refreshAllData();
                        }
                        setExternalMessage(prompt); 
                        setIsChatOpen(true); 
                    }} 
                />
            </div>

            <div className="xl:w-[380px] space-y-8">
                <MyStatusDashboard 
                    currentUser={currentUser} 
                    reports={reports} 
                    bookings={bookings} 
                    activities={activities} 
                />

                <DamageReportChart 
                    reports={reports} 
                    onProcessAction={m => { setExternalMessage(m); setIsChatOpen(true); }} 
                    isReadOnly={!isAdminRole} 
                />
            </div>
        </div>
      </main>

      {/* CHAT INTERFACE WITH AUTO-FORM SUPPORT */}
      <div className={`fixed bottom-8 right-8 z-[120] transition-all duration-500 ${isChatOpen ? 'w-full max-w-md' : 'w-auto'}`}>
          {isChatOpen ? (
              <div className="h-[75vh] shadow-4xl animate-slide-up rounded-[2.5rem] overflow-hidden border border-slate-200 bg-white">
                  <ChatInterface 
                    user={currentUser} roleConfig={ROLE_CONFIGS[currentUser.peran]} 
                    onDataSaved={async d => { 
                        const success = await db.addRecord(d.table, d.payload); 
                        if (success) {
                            setShowSavedNotification(true);
                            refreshAllData();
                        }
                        return success; 
                    }} 
                    stats={reports.filter(r => r.status === 'Pending').length} 
                    isOpen={isChatOpen} onToggle={() => setIsChatOpen(false)} 
                    externalMessage={externalMessage} onClearExternalMessage={() => setExternalMessage(null)}
                    autoFormId={autoFormId} onClearAutoForm={() => setAutoFormId(null)}
                    inventaris={inventaris}
                  />
              </div>
          ) : (
              <button onClick={() => setIsChatOpen(true)} className="group bg-slate-900 text-white px-8 py-5 rounded-full shadow-2xl flex items-center gap-3 hover:bg-indigo-600 transition-all hover:scale-105 active:scale-95">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-black text-sm tracking-tight">SIKILAT AI</span>
              </button>
          )}
      </div>

      <SQLEditor isOpen={isSqlEditorOpen} onClose={() => setIsSqlEditorOpen(false)} />
      <ConnectionModal isOpen={isConnectionModalOpen} onClose={() => setIsConnectionModalOpen(false)} />

      {/* NOTIF */}
      {showSavedNotification && (
        <div className="fixed bottom-10 left-10 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl animate-fade-in flex items-center gap-4 z-[200] border border-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Cloud Update Successful</span>
            <button onClick={() => setShowSavedNotification(false)}><X className="w-4 h-4"/></button>
        </div>
      )}
    </div>
  );
};

export default App;
