
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
  PlusCircle,
  Users
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
  const [allUsers, setAllUsers] = useState<Pengguna[]>([]); // Untuk mapping nama
  
  const [aiConclusion, setAiConclusion] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isActuallyAdmin = currentUser?.peran === 'admin';
  const isGuru = currentUser?.peran === 'guru';
  const isSupervisor = currentUser && ['pengawas_admin', 'pengawas_it', 'pengawas_sarpras', 'penanggung_jawab'].includes(currentUser.peran);

  const refreshAllData = useCallback(async () => {
    try {
        const [b, r, e, i, a, u] = await Promise.all([
            db.getTable('peminjaman_antrian'),
            db.getTable('pengaduan_kerusakan'),
            db.getTable('penilaian_aset'),
            db.getTable('inventaris'),
            db.getTable('agenda_kegiatan'),
            db.getTable('pengguna')
        ]);
        setBookings(b || []); 
        setReports(r || []); 
        setEvaluations(e || []); 
        setInventaris(i || []); 
        setActivities(a || []);
        setAllUsers(u || []);
        setCloudDocCount((b?.length || 0) + (r?.length || 0) + (e?.length || 0) + (i?.length || 0) + (a?.length || 0));
    } catch (err) { 
        console.error("Refresh Error:", err);
    }
  }, []);

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
    window.addEventListener('SIKILAT_SYNC_COMPLETE', refreshAllData);
    return () => window.removeEventListener('SIKILAT_SYNC_COMPLETE', refreshAllData);
  }, [refreshAllData]);

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
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col relative font-inter overflow-x-hidden">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-[100] flex items-center px-4 md:px-10">
          <div className="max-w-[1800px] w-full mx-auto flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg shadow-slate-200">S</div>
                  <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-base md:text-lg tracking-tight uppercase leading-none">SIKILAT</span>
                        <span className="hidden md:inline-block text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">SMP 6 PKL</span>
                      </div>
                  </div>
              </div>
              
              <div className="flex items-center gap-3 md:gap-6">
                  {isActuallyAdmin && (
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full">
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CLOUD DATA:</span>
                        <span className="text-xs font-black text-slate-900">{cloudDocCount}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end mr-1">
                        <span className="text-[11px] md:text-xs font-black text-slate-900 leading-none">{currentUser.nama_lengkap}</span>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md mt-1 ${isActuallyAdmin ? 'bg-rose-50 text-rose-600 border border-rose-100' : isGuru ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-indigo-50 text-indigo-600'}`}>
                            {currentUser.peran.replace('_', ' ')}
                        </span>
                    </div>
                    <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="relative group flex-shrink-0">
                        <img src={currentUser.avatar} className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover border-2 border-slate-100 group-hover:border-indigo-400 transition-all shadow-sm" alt="avatar"/>
                    </button>
                    {isProfileMenuOpen && (
                        <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-[110] animate-slide-up">
                            <div className="px-4 py-2 border-b border-slate-50 mb-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesi Aktif</p>
                                <p className="text-xs font-bold text-slate-600 truncate">{currentUser.email}</p>
                            </div>
                            {isActuallyAdmin && (
                                <>
                                    <button onClick={() => setIsConnectionModalOpen(true)} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                                        <Cloud className="w-4 h-4 text-indigo-500" /> Cloud Sync Node
                                    </button>
                                    <button onClick={() => setIsSqlEditorOpen(true)} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                                        <Terminal className="w-4 h-4 text-slate-700" /> SQL Engine Editor
                                    </button>
                                    <div className="h-px bg-slate-100 my-1"></div>
                                </>
                            )}
                            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"><LogOut className="w-4 h-4" /> Keluar Sesi</button>
                        </div>
                    )}
                  </div>
              </div>
          </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto p-4 md:p-10 pt-20 md:pt-24 pb-24">
        <div className="flex flex-col xl:flex-row gap-8">
            {/* Area Kiri: Utama */}
            <div className={`flex-1 space-y-8 md:space-y-10 ${isGuru ? 'xl:w-2/3' : ''}`}>
                
                {/* AI HERO - Hanya Admin/Supervisor */}
                {!isGuru && !aiConclusion && !isAnalyzing && (
                    <div className="bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 text-white flex justify-between items-center shadow-2xl shadow-slate-200 relative overflow-hidden group">
                        <div className="relative z-10">
                            <h2 className="text-xl md:text-2xl font-black italic mb-2 tracking-tight uppercase">Executive AI Analysis</h2>
                            <p className="text-slate-400 text-[10px] md:text-xs mb-6 max-w-md font-medium">Kalkulasi performa tim dan utilisasi aset sekolah secara instan.</p>
                            <button onClick={async () => {
                                setIsAnalyzing(true);
                                setAiConclusion(null);
                                const result = await generateGlobalConclusion({ reports, bookings, activities, inventaris }, currentUser);
                                setAiConclusion(result);
                                setIsAnalyzing(false);
                            }} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-900/20">
                                <Sparkles className="w-4 h-4" /> GENERATE INSIGHTS
                            </button>
                        </div>
                        <BrainCircuit className="hidden sm:block w-32 h-32 text-indigo-600/20 absolute -right-4 -bottom-4 rotate-12 group-hover:scale-110 transition-transform duration-700" />
                    </div>
                )}

                {/* CONCLUSION VIEW */}
                {!isGuru && (aiConclusion || isAnalyzing) && (
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-100 animate-slide-up relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
                         <button onClick={() => setAiConclusion(null)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all"><X className="w-4 h-4 text-slate-400"/></button>
                         <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-slate-900 text-white rounded-lg shadow-md"><Sparkles className="w-5 h-5" /></div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight italic">Hasil Analisis Strategis</h3>
                         </div>
                         <div className="bg-slate-50/50 p-5 md:p-6 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed italic">
                            {isAnalyzing ? (
                                <div className="flex items-center gap-3 font-bold text-slate-400 animate-pulse">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Menghubungkan Intelligence Node...
                                </div>
                            ) : aiConclusion}
                         </div>
                    </div>
                )}

                {/* Booking Table - Terpusat untuk Guru */}
                <BookingTable 
                    bookings={bookings} 
                    users={allUsers}
                    currentUserRole={currentUser.peran} 
                    onUpdateStatus={async (id, status) => {
                        await db.updateStatus('peminjaman_antrian', id, 'id_peminjaman', { status_peminjaman: status });
                        refreshAllData();
                    }}
                    onAddBooking={() => { setAutoFormId('booking_ruangan'); setIsChatOpen(true); }}
                />

                {!isGuru && (
                    <>
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
                    </>
                )}
            </div>

            {/* Area Kanan: Informasi & Status */}
            <div className={`xl:w-[380px] space-y-8 ${isGuru ? 'xl:w-1/3' : ''}`}>
                <MyStatusDashboard 
                    currentUser={currentUser} 
                    reports={reports} 
                    bookings={bookings} 
                    activities={activities} 
                />

                {!isGuru && (
                    <DamageReportChart 
                        reports={reports} 
                        onProcessAction={m => { setExternalMessage(m); setIsChatOpen(true); }} 
                        isReadOnly={!isActuallyAdmin && !isSupervisor} 
                    />
                )}
                
                {isGuru && (
                    <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                        <h4 className="text-xl font-black italic tracking-tight mb-2">Butuh Bantuan?</h4>
                        <p className="text-indigo-100 text-xs font-medium leading-relaxed mb-6">Hubungi AI SIKILAT untuk cek ketersediaan proyektor, kabel HDMI, atau ruang Lab secara instan.</p>
                        <button onClick={() => setIsChatOpen(true)} className="w-full bg-white text-indigo-600 py-3 rounded-xl font-black text-xs hover:shadow-2xl transition-all">TANYA AI SEKARANG</button>
                        <Sparkles className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 rotate-12" />
                    </div>
                )}
            </div>
        </div>
      </main>

      {/* CHAT INTERFACE */}
      <div className={`fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[120] transition-all duration-500 ${isChatOpen ? 'w-[calc(100%-2rem)] md:w-full md:max-w-md' : 'w-auto'}`}>
          {isChatOpen ? (
              <div className="h-[80vh] md:h-[75vh] shadow-4xl animate-slide-up rounded-3xl md:rounded-[2.5rem] overflow-hidden border border-slate-200 bg-white">
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
              <button onClick={() => setIsChatOpen(true)} className="group bg-slate-900 text-white px-6 md:px-8 py-4 md:py-5 rounded-full shadow-2xl flex items-center gap-3 hover:bg-indigo-600 transition-all hover:scale-105 active:scale-95 border border-slate-700">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-black text-sm tracking-tight">SIKILAT AI</span>
              </button>
          )}
      </div>

      <SQLEditor isOpen={isSqlEditorOpen} onClose={() => setIsSqlEditorOpen(false)} />
      <ConnectionModal isOpen={isConnectionModalOpen} onClose={() => setIsConnectionModalOpen(false)} />

      {/* NOTIF */}
      {showSavedNotification && (
        <div className="fixed bottom-6 left-6 md:bottom-10 md:left-10 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-fade-in flex items-center gap-4 z-[200] border border-slate-700">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Database Sync Success</span>
            <button onClick={() => setShowSavedNotification(false)} className="ml-2 hover:bg-white/10 p-1 rounded"><X className="w-4 h-4"/></button>
        </div>
      )}
    </div>
  );
};

export default App;
