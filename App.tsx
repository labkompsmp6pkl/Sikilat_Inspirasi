
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import MyStatusDashboard from './components/MyStatusDashboard';
import DamageReportChart from './components/DamageReportChart';
import PendingTicketTable from './components/PendingTicketTable';
import AgendaActivityTable from './components/AgendaActivityTable'; 
import BookingTable from './components/BookingTable';
import ConnectionModal from './components/ConnectionModal';
import { ROLE_CONFIGS } from './constants';
import { User, UserRole, SavedData, PengaduanKerusakan, PeminjamanAntrian, Pengguna, Lokasi, Inventaris, AgendaKegiatan, PenilaianAset } from './types';
import db from './services/dbService'; 
import { supabase } from './services/supabaseClient';
import { generateReplySuggestion } from './services/geminiService';
import { LogOut, ShieldCheck, Database, ChevronDown, CloudLightning, Share2, CheckCircle2, Globe, Key, Settings as SettingsIcon, X, Server, Wifi, Activity, Star, Monitor, Building2, MessageSquare, ArrowRight, Zap, MessageCircle, Filter, ListFilter, Bookmark, User as UserIcon, Sparkles, ClipboardList, ShieldAlert, Undo2, Check, Send, Sparkle, MapPin, Cloud, RefreshCcw, DatabaseZap, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Pengguna | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [isSyncingGlobal, setIsSyncingGlobal] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); 
  const [externalMessage, setExternalMessage] = useState<string | null>(null);
  const [cloudDocCount, setCloudDocCount] = useState(18);

  const [bookings, setBookings] = useState<PeminjamanAntrian[]>([]);
  const [reports, setReports] = useState<PengaduanKerusakan[]>([]);
  const [evaluations, setEvaluations] = useState<PenilaianAset[]>([]);
  const [inventaris, setInventaris] = useState<Inventaris[]>([]);
  const [activities, setActivities] = useState<AgendaKegiatan[]>([]); 
  
  const refreshAllData = useCallback(async () => {
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
    
    const config = db.getCloudConfig();
    setCloudDocCount(config.lastSyncCount || 18);
  }, []);

  // Auth Initialization & Session Monitoring
  useEffect(() => {
    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const profile = await db.getUserProfile(session.user.id);
            if (profile) {
                setCurrentUser(profile);
                await refreshAllData();
            }
        }
        setIsAppLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            const profile = await db.getUserProfile(session.user.id);
            setCurrentUser(profile);
            await refreshAllData();
        } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
        }
    });

    return () => subscription.unsubscribe();
  }, [refreshAllData]);

  useEffect(() => {
    // Listen for background sync completion
    const handleSyncComplete = () => {
        refreshAllData();
        setShowSavedNotification(true);
        setTimeout(() => setShowSavedNotification(false), 3000);
    };
    
    window.addEventListener('SIKILAT_SYNC_COMPLETE', handleSyncComplete);
    return () => window.removeEventListener('SIKILAT_SYNC_COMPLETE', handleSyncComplete);
  }, [refreshAllData]);

  const handleDataSaved = useCallback(async (data: SavedData) => {
      setIsSyncingGlobal(true);
      await db.addRecord(data.table, data.payload);
      await refreshAllData();
      setIsSyncingGlobal(false);
  }, [refreshAllData]);

  const handleUpdateAgendaStatus = useCallback(async (id: string, status: 'Disetujui' | 'Ditolak', reason?: string) => {
      const allAgendas = await db.getTable('agenda_kegiatan');
      const target = allAgendas.find(a => a.id === id);
      if (target) {
          setIsSyncingGlobal(true);
          target.status = status;
          target.alasan_penolakan = reason;
          target.direview_oleh = currentUser?.nama_lengkap;
          await db.addRecord('agenda_kegiatan', target);
          await refreshAllData();
          setIsSyncingGlobal(false);
      }
  }, [currentUser, refreshAllData]);

  const handleUpdateBookingStatus = useCallback(async (id: string, status: 'Disetujui' | 'Ditolak', reason?: string) => {
      const allBookings = await db.getTable('peminjaman_antrian');
      const target = allBookings.find(b => b.id_peminjaman === id);
      if (target) {
          setIsSyncingGlobal(true);
          target.status_peminjaman = status;
          target.alasan_penolakan = reason;
          await db.addRecord('peminjaman_antrian', target);
          await refreshAllData();
          setIsSyncingGlobal(false);
      }
  }, [refreshAllData]);

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    await supabase.auth.signOut();
  };

  if (isAppLoading) {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">SIKILAT is Loading</p>
          </div>
      );
  }

  if (!currentUser) return <Login onLoginSuccess={(u) => setCurrentUser(u)} />;

  const roleConfig = ROLE_CONFIGS[currentUser.peran];
  const isGuru = currentUser.peran === 'guru';
  const isAdminOnly = currentUser.peran === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-[100] shadow-md flex items-center">
        <div className="max-w-screen-2xl w-full mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg"> S </div>
             <div className="hidden sm:block">
                <span className="font-black text-slate-800 text-lg tracking-tight">SIKILAT</span>
                <span className="ml-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">SMP 6 PKL</span>
             </div>
          </div>

          <div className="flex items-center gap-4">
             {/* New Document Count Indicator */}
             <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-2xl">
                 <DatabaseZap className="w-3.5 h-3.5 text-blue-500" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cloud Records:</span>
                 <span className="text-xs font-black text-slate-900">{cloudDocCount}</span>
             </div>

             {isSyncingGlobal && (
                 <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 animate-pulse">
                    <RefreshCcw className="w-3 h-3 animate-spin" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Syncing...</span>
                 </div>
             )}

             <div className="flex items-center gap-4 bg-slate-50 px-4 py-1.5 rounded-2xl border border-slate-100">
                <div className="flex flex-col items-end">
                    <p className="text-[13px] font-black text-slate-900 leading-none mb-1">{currentUser.nama_lengkap}</p>
                    <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-${roleConfig.color}-50 text-${roleConfig.color}-600 border border-${roleConfig.color}-100`}>
                        {roleConfig.label}
                    </div>
                </div>
                <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="relative">
                    <img src={currentUser.avatar} alt="Profile" className="w-9 h-9 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200"/>
                    {isProfileMenuOpen && (
                        <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 overflow-hidden animate-slide-up">
                             <div className="px-4 py-2 border-b border-slate-50">
                                 <p className="text-[10px] font-black text-slate-400 uppercase">Profil Aktif</p>
                                 <p className="text-xs font-bold text-slate-800 truncate">{currentUser.email}</p>
                             </div>
                             <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-black transition-colors">
                                <LogOut className="w-4 h-4"/> Keluar Sesi
                            </button>
                        </div>
                    )}
                </button>
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl w-full mx-auto p-4 sm:p-8 pt-24 pb-32">
        {isGuru ? (
            <div className="animate-fade-in space-y-8 max-w-5xl mx-auto">
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[3rem] p-8 sm:p-12 shadow-2xl text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-white/20">
                            <Sparkles className="w-3.5 h-3.5 text-blue-300" /> Secure Workspace
                        </div>
                        <h2 className="text-4xl font-black mb-4">Halo, {currentUser.nama_lengkap.split(' ')[0]}!</h2>
                        <p className="text-blue-100/80 text-lg max-w-xl font-medium leading-relaxed">Dashboard Anda kini sinkron secara real-time dengan Supabase cloud storage.</p>
                    </div>
                    <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
                </div>
                <MyStatusDashboard currentUser={currentUser} reports={reports} bookings={bookings} />
                <BookingTable bookings={bookings} currentUserRole={currentUser.peran} />
            </div>
        ) : (
            <div className="animate-fade-in space-y-8">
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    <div className="xl:col-span-3 space-y-8">
                        <BookingTable 
                            bookings={bookings} 
                            currentUserRole={currentUser.peran} 
                            onUpdateStatus={handleUpdateBookingStatus}
                        />
                        <AgendaActivityTable 
                            activities={activities} 
                            currentUserRole={currentUser.peran} 
                            onUpdateStatus={handleUpdateAgendaStatus}
                        />
                        <PendingTicketTable reports={reports} onProcessAction={(p) => { setExternalMessage(p); setIsChatOpen(true); }} />
                    </div>
                    <div className="xl:col-span-1 space-y-8">
                         <MyStatusDashboard currentUser={currentUser} reports={reports} bookings={bookings} activities={activities} />
                    </div>
                </div>
            </div>
        )}
      </main>

      <ConnectionModal isOpen={isConnectionModalOpen} onClose={() => setIsConnectionModalOpen(false)} />

      <div className={`fixed bottom-0 right-0 z-50 p-6 transition-all duration-300 ${isChatOpen ? 'w-full max-w-lg' : 'w-auto'}`}>
          {isChatOpen ? (
              <div className="h-[650px] shadow-2xl animate-slide-up">
                  <ChatInterface 
                    user={currentUser} 
                    roleConfig={roleConfig} 
                    onDataSaved={handleDataSaved} 
                    stats={reports.filter(r => r.status === 'Pending').length} 
                    isOpen={isChatOpen} 
                    onToggle={() => setIsChatOpen(false)} 
                    externalMessage={externalMessage}
                    onClearExternalMessage={() => setExternalMessage(null)}
                  />
              </div>
          ) : (
              <button onClick={() => setIsChatOpen(true)} className="flex items-center gap-3 bg-slate-900 text-white p-5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all border-4 border-white">
                  <MessageCircle className="w-7 h-7" />
                  <span className="font-black text-base hidden sm:inline pr-2">SIKILAT AI</span>
              </button>
          )}
      </div>

      {showSavedNotification && (
        <div className="fixed bottom-28 right-8 bg-blue-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl animate-fade-in-up z-[200] border-4 border-white">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm font-black italic">Supabase Cloud Updated!</p>
                    <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Profile: {currentUser.id_pengguna.slice(0,8)}... &bull; OK</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
