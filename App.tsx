
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
  Users,
  LayoutDashboard,
  CalendarDays,
  ShieldCheck,
  RefreshCw,
  Key,
  ShieldAlert
} from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Pengguna | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState({ title: '', sub: '' });
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
  const [allUsers, setAllUsers] = useState<Pengguna[]>([]); 
  
  const [aiConclusion, setAiConclusion] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isResettingUser, setIsResettingUser] = useState<string | null>(null);

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
            db.getAllUsers()
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

  const showNotification = (title: string, sub: string) => {
    setNotificationMsg({ title, sub });
    setShowSavedNotification(true);
    setTimeout(() => setShowSavedNotification(false), 5000);
  };

  const handleAdminResetPassword = async (userId: string, userName: string) => {
    const newPass = window.prompt(`Masukkan password baru untuk ${userName}:`, 'Sikilat123');
    if (!newPass) return;

    setIsResettingUser(userId);
    try {
        const success = await db.adminResetPassword(userId, newPass);
        if (success) {
            showNotification("Kredensial Diperbarui", `Password ${userName} telah diubah menjadi: ${newPass}`);
            db.addSyncLog(`Admin mengubah password untuk ${userName}.`);
        } else {
            alert("Gagal memproses permintaan Cloud.");
        }
    } catch (e) {
        console.error("Reset click error:", e);
    } finally {
        setIsResettingUser(null);
    }
  };

  if (isAppLoading) return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc] text-slate-900">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
          <h1 className="text-xl font-black italic tracking-tight uppercase">Sikilat Node Starting...</h1>
      </div>
  );

  if (!currentUser) return <Login onLoginSuccess={setCurrentUser} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col relative font-inter overflow-x-hidden">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200 z-[100] flex items-center px-4 md:px-10">
          <div className="max-w-[1800px] w-full mx-auto flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-slate-200/50">S</div>
                  <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-lg md:text-xl tracking-tighter uppercase leading-none italic">SIKILAT</span>
                        <span className="hidden md:inline-block text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg uppercase tracking-widest">SMP 6 PKL</span>
                      </div>
                  </div>
              </div>
              
              <div className="flex items-center gap-3 md:gap-6">
                  {isActuallyAdmin && (
                    <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
                        <DatabaseZap className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">DB_SYNC:</span>
                        <span className="text-xs font-black text-slate-900">{cloudDocCount}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end mr-1">
                        <span className="text-[11px] md:text-xs font-black text-slate-900 leading-none">{currentUser.nama_lengkap}</span>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md mt-1.5 border ${isActuallyAdmin ? 'bg-rose-50 text-rose-600 border-rose-100' : isGuru ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                            {currentUser.peran.replace('_', ' ')}
                        </span>
                    </div>
                    <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="relative group flex-shrink-0">
                        <img src={currentUser.avatar} className="w-9 h-9 md:w-10 md:h-10 rounded-2xl object-cover border-2 border-white group-hover:border-indigo-400 transition-all shadow-md ring-1 ring-slate-100" alt="avatar"/>
                    </button>
                    {isProfileMenuOpen && (
                        <div className="absolute right-0 top-14 w-60 bg-white rounded-3xl shadow-4xl border border-slate-100 py-3 z-[110] animate-slide-up ring-1 ring-slate-200/50">
                            <div className="px-5 py-2 border-b border-slate-50 mb-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">Sesi Pengguna</p>
                                <p className="text-xs font-bold text-slate-600 truncate mt-1">{currentUser.email}</p>
                            </div>
                            {isActuallyAdmin && (
                                <>
                                    <button onClick={() => setIsConnectionModalOpen(true)} className="w-full text-left px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                                        <Cloud className="w-4 h-4 text-indigo-500" /> Koneksi Supabase
                                    </button>
                                    <button onClick={() => setIsSqlEditorOpen(true)} className="w-full text-left px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                                        <Terminal className="w-4 h-4 text-slate-700" /> SQL Engine Editor
                                    </button>
                                    <div className="h-px bg-slate-100 my-2 mx-4"></div>
                                </>
                            )}
                            <button onClick={handleLogout} className="w-full text-left px-5 py-2.5 text-xs font-black text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors"><LogOut className="w-4 h-4" /> Keluar Sesi</button>
                        </div>
                    )}
                  </div>
              </div>
          </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto p-4 md:p-10 pt-24 md:pt-28 pb-24">
        <div className="flex flex-col xl:flex-row gap-8 items-start">
            
            {/* Area Kiri: Utama */}
            <div className={`w-full space-y-8 md:space-y-10 ${isGuru ? 'xl:w-2/3' : 'xl:flex-1'}`}>
                
                {/* AI HERO - Hanya Admin/Supervisor */}
                {!isGuru && !aiConclusion && !isAnalyzing && (
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white flex justify-between items-center shadow-4xl shadow-slate-200 relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-600 rounded-lg"><Sparkles className="w-5 h-5" /></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Intelligence Node v3.0</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black italic mb-3 tracking-tighter uppercase leading-none">Executive Analysis</h2>
                            <p className="text-slate-400 text-xs md:text-sm mb-8 max-w-md font-medium leading-relaxed">Dapatkan ringkasan performa pemeliharaan dan tren penggunaan aset sekolah secara otomatis.</p>
                            <button onClick={async () => {
                                setIsAnalyzing(true);
                                setAiConclusion(null);
                                const result = await generateGlobalConclusion({ reports, bookings, activities, inventaris }, currentUser);
                                setAiConclusion(result);
                                setIsAnalyzing(false);
                            }} className="flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-xs hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-2xl">
                                <Activity className="w-4 h-4" /> GENERATE DASHBOARD INSIGHTS
                            </button>
                        </div>
                        <BrainCircuit className="hidden sm:block w-48 h-48 text-indigo-500/10 absolute -right-6 -bottom-6 rotate-12 group-hover:scale-110 transition-transform duration-1000" />
                    </div>
                )}

                {/* CONCLUSION VIEW */}
                {!isGuru && (aiConclusion || isAnalyzing) && (
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-slate-200/40 border border-slate-100 animate-slide-up relative overflow-hidden ring-1 ring-slate-100">
                         <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
                         <button onClick={() => setAiConclusion(null)} className="absolute top-8 right-8 p-3 hover:bg-slate-100 rounded-full transition-all"><X className="w-5 h-5 text-slate-300 hover:text-slate-900"/></button>
                         <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl"><Sparkles className="w-6 h-6" /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight italic uppercase leading-none">Intelligence Report</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Kalkulasi Strategis Tim Teknis</p>
                            </div>
                         </div>
                         <div className="bg-slate-50/70 p-6 md:p-8 rounded-[2rem] border border-slate-200/60 text-sm md:text-base text-slate-700 leading-relaxed italic font-medium shadow-inner">
                            {isAnalyzing ? (
                                <div className="flex items-center gap-4 font-black text-slate-400 animate-pulse py-4">
                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" /> 
                                    <span className="tracking-widest uppercase">Analyzing Maintenance Vectors...</span>
                                </div>
                            ) : aiConclusion}
                         </div>
                    </div>
                )}

                {/* USER MANAGEMENT (ONLY FOR ADMIN) */}
                {isActuallyAdmin && (
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm animate-slide-up">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Users className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight italic uppercase leading-none">Manajemen Pengguna</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Kontrol Akses & Kredensial</p>
                                </div>
                            </div>
                            <button onClick={refreshAllData} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><RefreshCw className="w-5 h-5" /></button>
                        </div>
                        <div className="overflow-x-auto rounded-[1.5rem] border border-slate-50">
                            <table className="w-full text-left text-xs font-medium">
                                <thead className="bg-slate-50 text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Nama & Email</th>
                                        <th className="px-6 py-4">Peran</th>
                                        <th className="px-6 py-4 text-right">Aksi Kontrol</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {allUsers.map(u => (
                                        <tr key={u.id_pengguna} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={u.avatar} className="w-8 h-8 rounded-lg object-cover" />
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-800">{u.nama_lengkap}</span>
                                                        <span className="text-slate-400 font-bold">{u.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${u.peran === 'admin' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                    {u.peran.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleAdminResetPassword(u.id_pengguna, u.nama_lengkap)}
                                                    disabled={isResettingUser === u.id_pengguna}
                                                    className={`inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-50 ${isResettingUser === u.id_pengguna ? 'bg-indigo-600 cursor-wait' : ''}`}
                                                >
                                                    {isResettingUser === u.id_pengguna ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                                                    Reset Password
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab Info Khusus Guru: Memfokuskan pada Jadwal */}
                {isGuru && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                <CalendarDays className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Booking Hari Ini</p>
                                <p className="text-2xl font-black text-slate-900">
                                  {bookings.filter(b => b.tanggal_peminjaman && b.tanggal_peminjaman.toString().includes(new Date().toISOString().split('T')[0])).length} Sesi
                                </p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                <LayoutDashboard className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status Ruangan</p>
                                <p className="text-2xl font-black text-slate-900">Live Monitor</p>
                            </div>
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
            <div className={`w-full xl:w-[400px] space-y-8 flex-shrink-0`}>
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
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden border border-slate-800">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg"><Sparkles className="w-5 h-5 text-white" /></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">SIKILAT AI NODE</span>
                        </div>
                        <h4 className="text-xl font-black italic tracking-tighter mb-3 uppercase">Punya Masalah Aset?</h4>
                        <p className="text-slate-400 text-xs font-medium leading-relaxed mb-8">Konsultasikan kendala proyektor, jaringan, atau ketersediaan ruangan langsung dengan AI kami.</p>
                        <button onClick={() => setIsChatOpen(true)} className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-xs hover:bg-indigo-600 hover:text-white transition-all shadow-xl active:scale-95">MULAI CHAT INTERAKTIF</button>
                        <BrainCircuit className="absolute -right-6 -bottom-6 w-32 h-32 opacity-5 rotate-12" />
                    </div>
                )}
            </div>
        </div>
      </main>

      {/* CHAT INTERFACE */}
      <div className={`fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[120] transition-all duration-500 ${isChatOpen ? 'w-[calc(100%-2rem)] md:w-full md:max-w-md' : 'w-auto'}`}>
          {isChatOpen ? (
              <div className="h-[80vh] md:h-[75vh] shadow-4xl animate-slide-up rounded-[2.5rem] overflow-hidden border border-slate-200 bg-white ring-1 ring-slate-100">
                  <ChatInterface 
                    user={currentUser} roleConfig={ROLE_CONFIGS[currentUser.peran]} 
                    onDataSaved={async d => { 
                        const success = await db.addRecord(d.table, d.payload); 
                        if (success) {
                            showNotification("Berhasil Disimpan", `Data di tabel ${d.table} berhasil diperbarui.`);
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
              <button onClick={() => setIsChatOpen(true)} className="group bg-slate-900 text-white px-8 py-5 rounded-full shadow-4xl flex items-center gap-3 hover:bg-indigo-600 transition-all hover:scale-105 active:scale-95 border border-slate-700 ring-4 ring-white/10">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-black text-sm tracking-tight">SIKILAT AI ASSISTANT</span>
              </button>
          )}
      </div>

      <SQLEditor isOpen={isSqlEditorOpen} onClose={() => setIsSqlEditorOpen(false)} />
      <ConnectionModal isOpen={isConnectionModalOpen} onClose={() => setIsConnectionModalOpen(false)} />

      {/* NOTIF */}
      {showSavedNotification && (
        <div className="fixed bottom-6 left-6 md:bottom-10 md:left-10 bg-slate-900 text-white px-8 py-5 rounded-2xl shadow-4xl animate-fade-in flex items-center gap-5 z-[200] border border-slate-700 ring-1 ring-white/10">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div className="flex flex-col">
                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-emerald-400">{notificationMsg.title}</span>
                <span className="text-[9px] font-bold text-slate-400">{notificationMsg.sub}</span>
            </div>
            <button onClick={() => setShowSavedNotification(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors ml-4"><X className="w-4 h-4"/></button>
        </div>
      )}
    </div>
  );
};

export default App;
