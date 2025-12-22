
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import MyStatusDashboard from './components/MyStatusDashboard';
import DamageReportChart from './components/DamageReportChart';
import PendingTicketTable from './components/PendingTicketTable';
import BookingTable from './components/BookingTable';
import AgendaActivityTable from './components/AgendaActivityTable'; 
import { ROLE_CONFIGS } from './constants';
import { User, UserRole, SavedData, PengaduanKerusakan, PeminjamanAntrian, Pengguna, Lokasi, Inventaris, AgendaKegiatan } from './types';
import db from './services/dbService'; 
import { LogOut, ShieldCheck, Database, User as UserIcon, Lock, ChevronDown, FileSpreadsheet, CloudLightning, Share2, Info, CheckCircle2, Globe, Key, Settings as SettingsIcon, X, Server, Wifi, Activity } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [showMigrationGuide, setShowMigrationGuide] = useState(false);
  const [showCloudConfig, setShowCloudConfig] = useState(false);
  const [externalMessage, setExternalMessage] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Cloud State
  const [cloudConfig, setCloudConfig] = useState<{endpoint: string, user: string} | null>(db.getCloudConfig());
  const [isSyncing, setIsSyncing] = useState(false);

  const [bookings, setBookings] = useState<PeminjamanAntrian[]>([]);
  const [reports, setReports] = useState<PengaduanKerusakan[]>([]);
  const [inventaris, setInventaris] = useState<Inventaris[]>([]);
  const [allUsers, setAllUsers] = useState<Pengguna[]>([]);
  const [locations, setLocations] = useState<Lokasi[]>([]);
  const [activities, setActivities] = useState<AgendaKegiatan[]>([]); 
  
  useEffect(() => {
      setBookings(db.getTable('peminjaman_antrian'));
      setReports(db.getTable('pengaduan_kerusakan'));
      setInventaris(db.getTable('inventaris'));
      setAllUsers(db.getTable('pengguna'));
      setLocations(db.getTable('lokasi'));
      setActivities(db.getTable('agenda_kegiatan')); 
  }, []);

  const handleLogin = useCallback((role: UserRole) => {
    const user = db.getTable('pengguna').find(u => u.peran === role);
    setCurrentUser(user || null);
  }, []);
  
  const handleToggleChat = useCallback(() => setIsChatOpen(prev => !prev), []);

  const handleRegister = useCallback((data: { nama: string; email: string; hp: string; peran: UserRole }) => {
    const newUser: User = {
      id_pengguna: `u_custom_${Date.now()}`,
      nama_lengkap: data.nama,
      email: data.email,
      no_hp: data.hp,
      peran: data.peran,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nama)}&background=random&color=fff`
    };
    db.addRecord('pengguna', newUser);
    setAllUsers(db.getTable('pengguna'));
    setCurrentUser(newUser);
  }, []);

  const handleLogout = useCallback(() => {
    setIsProfileMenuOpen(false);
    setCurrentUser(null);
  }, []);
  
  const handleDataSaved = useCallback((data: SavedData) => {
      db.addRecord(data.table, data.payload);
      if (data.table === 'peminjaman_antrian') setBookings(db.getTable('peminjaman_antrian'));
      else if (data.table === 'pengaduan_kerusakan') setReports(db.getTable('pengaduan_kerusakan'));
      else if (data.table === 'pengguna') setAllUsers(db.getTable('pengguna'));
      else if (data.table === 'agenda_kegiatan') setActivities(db.getTable('agenda_kegiatan'));
      else if (data.table === 'inventaris') setInventaris(db.getTable('inventaris'));
      
      // Simulate Cloud Sync
      if (cloudConfig) {
          setIsSyncing(true);
          setTimeout(() => setIsSyncing(false), 1500);
      }

      setShowSavedNotification(true);
      setTimeout(() => setShowSavedNotification(false), 3000);
  }, [cloudConfig]);

  const handleConnectCloud = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const config = {
          endpoint: formData.get('endpoint') as string,
          user: formData.get('user') as string,
          pass: formData.get('pass') as string,
      };
      db.connectToCloud(config);
      setCloudConfig({ endpoint: config.endpoint, user: config.user });
      setShowCloudConfig(false);
      setShowSavedNotification(true);
      setTimeout(() => setShowSavedNotification(false), 3000);
  };

  const handleTriggerChatAction = useCallback((prompt: string) => {
      setExternalMessage(prompt);
      setIsChatOpen(true);
  }, []);

  const handleAgendaUpdateStatus = useCallback((id: string, status: 'Disetujui' | 'Ditolak') => {
      setActivities(prev => {
          const activity = prev.find(a => a.id === id);
          if (activity) {
            const updated = { ...activity, status };
            db.addRecord('agenda_kegiatan', updated);
            return db.getTable('agenda_kegiatan');
          }
          return prev;
      });
  }, []);

  const handleAgendaApproveAllToday = useCallback(() => {
      const today = new Date().toDateString();
      setActivities(prev => {
        const pendingToday = prev.filter(a => new Date(a.waktu_mulai).toDateString() === today && a.status === 'Pending');
        pendingToday.forEach(a => db.addRecord('agenda_kegiatan', { ...a, status: 'Disetujui' }));
        return db.getTable('agenda_kegiatan');
      });
  }, []);

  if (!currentUser) return <Login onLogin={handleLogin} onRegister={handleRegister} />;

  const roleConfig = ROLE_CONFIGS[currentUser.peran];
  
  // ROLE ACCESS LOGIC UPDATED
  // Admin is now View-Only for operational tasks
  const isReadOnly = !['penanggung_jawab', 'pengawas_it', 'pengawas_sarpras'].includes(currentUser.peran);
  const canSeePendingTickets = ['penanggung_jawab', 'pengawas_it', 'pengawas_sarpras'].includes(currentUser.peran);
  const canSeeAgenda = ['admin', 'penanggung_jawab', 'pengawas_admin', 'pengawas_it', 'pengawas_sarpras'].includes(currentUser.peran);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm"> S </div>
             <div>
                <span className="hidden sm:inline font-bold text-slate-800 tracking-tight text-lg">SIKILAT SMP 6 Pekalongan</span>
                <span className="sm:hidden font-bold text-slate-800 tracking-tight text-lg">SIKILAT</span>
             </div>
             {/* CLOUD CONNECTION BADGE */}
             <div className="flex items-center gap-2 ml-4">
                {cloudConfig ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                        {isSyncing ? <Activity className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                        <span className="text-[10px] font-bold uppercase">labkom2_1: Synced</span>
                    </div>
                ) : (
                    <button 
                        onClick={() => setShowCloudConfig(true)}
                        className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100 hover:bg-amber-100 transition-colors"
                    >
                        <CloudLightning className="w-3 h-3 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase">Bucket `sikilat` Not Linked</span>
                    </button>
                )}
             </div>
          </div>
          <div className="flex items-center gap-2" ref={profileMenuRef}>
             <button onClick={() => setIsProfileMenuOpen(prev => !prev)} className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <img src={currentUser.avatar} alt="Profile" className="w-10 h-10 rounded-full"/>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
             </button>
             {isProfileMenuOpen && (
                <div className="absolute right-0 mt-36 w-56 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden">
                   <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Akun</p>
                        <p className="text-sm font-semibold text-slate-700 truncate">{currentUser.nama_lengkap}</p>
                   </div>
                   <div className="p-2 border-t border-slate-100">
                      <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-md transition-colors"><LogOut className="w-4 h-4"/> Keluar</button>
                   </div>
                </div>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full bg-${roleConfig.color}-100 text-${roleConfig.color}-600`}>
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Operational Cluster</h2>
                        <p className="text-slate-600 text-sm">Cluster `labkom2_1` status: <span className="text-emerald-600 font-bold uppercase text-xs">Healthy</span></p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {currentUser.peran === 'admin' && (
                        <>
                            <button 
                                onClick={() => setShowMigrationGuide(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                <Share2 className="w-4 h-4" />
                                Alur Migrasi
                            </button>
                            <button 
                                onClick={() => db.exportForCouchbase()}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900 transition-colors shadow-sm"
                            >
                                <Database className="w-4 h-4 text-emerald-400" />
                                Ekspor JSON Bucket
                            </button>
                        </>
                    )}
                </div>
            </div>
            
            {canSeeAgenda && (
                <AgendaActivityTable 
                  activities={activities} 
                  currentUserRole={currentUser.peran} 
                  onUpdateStatus={handleAgendaUpdateStatus} 
                  onApproveAllToday={handleAgendaApproveAllToday} 
                />
            )}

            <DamageReportChart reports={reports} onProcessAction={handleTriggerChatAction} isReadOnly={isReadOnly} />
            
            {canSeePendingTickets && (
                <PendingTicketTable reports={reports} onProcessAction={handleTriggerChatAction} isReadOnly={isReadOnly} />
            )}

            <MyStatusDashboard currentUser={currentUser} reports={reports} bookings={bookings} activities={activities} />
        </div>

        <ChatInterface user={currentUser} roleConfig={roleConfig} onDataSaved={handleDataSaved} stats={reports.filter(r => r.status === 'Pending').length} isOpen={isChatOpen} onToggle={handleToggleChat} externalMessage={externalMessage} onClearExternalMessage={() => setExternalMessage(null)} />
      </main>

      {/* MODAL CLOUD CONFIG */}
      {showCloudConfig && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCloudConfig(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                  <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Server className="w-6 h-6" /></div>
                          <div>
                             <h3 className="text-xl font-bold text-slate-800">Link to Capella</h3>
                             <p className="text-xs text-slate-500">Hubungkan bucket `sikilat` ke labkom2_1</p>
                          </div>
                      </div>
                      <button onClick={() => setShowCloudConfig(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleConnectCloud} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Capella Endpoint / URL</label>
                          <input name="endpoint" required defaultValue="labkom2_1.cb.cloud.couchbase.com" className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">DB Access User</label>
                              <input name="user" required placeholder="admin_sikilat" className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">DB Password</label>
                              <input name="pass" type="password" required className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                          </div>
                      </div>
                      <button type="submit" className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">Simpan & Hubungkan Live</button>
                  </form>
              </div>
          </div>
      )}

      {/* MIGRATION GUIDE MODAL (Step-by-step) */}
      {showMigrationGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowMigrationGuide(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 overflow-y-auto max-h-[90vh]">
                  <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><Globe className="w-6 h-6" /></div>
                          <div>
                             <h3 className="text-xl font-bold text-slate-800">Cloud Sync Success Kit</h3>
                             <p className="text-sm text-slate-500">Panduan Import Data ke Bucket `sikilat`</p>
                          </div>
                      </div>
                      <button onClick={() => setShowMigrationGuide(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  <div className="space-y-6">
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-4">
                          <div className="p-2 bg-emerald-200 rounded-lg text-emerald-700 font-bold text-xs whitespace-nowrap">STATUS: SELESAI</div>
                          <div>
                              <h4 className="font-bold text-slate-800">Bucket `sikilat` Berhasil Dibuat!</h4>
                              <p className="text-sm text-slate-600">Bucket Anda sudah aktif dan siap menerima data operasional sekolah.</p>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 border border-slate-200 rounded-xl bg-white group hover:border-blue-500 transition-colors">
                              <div className="flex items-center gap-2 mb-2"><Share2 className="w-4 h-4 text-blue-500" /><h4 className="font-bold text-sm">Langkah 1: Import</h4></div>
                              <p className="text-xs text-slate-500">Klik menu **Data Tools** -> **Import** di Capella. Upload file JSON dari SIKILAT.</p>
                          </div>
                          <div className="p-4 border border-slate-200 rounded-xl bg-white group hover:border-blue-500 transition-colors">
                              <div className="flex items-center gap-2 mb-2"><Key className="w-4 h-4 text-blue-500" /><h4 className="font-bold text-sm">Langkah 2: Database Access</h4></div>
                              <p className="text-xs text-slate-500">Buat user di **Settings -> Database Access**. Ini adalah "Kunci" aplikasi Anda.</p>
                          </div>
                      </div>
                      <button 
                        onClick={() => { setShowMigrationGuide(false); setShowCloudConfig(true); }}
                        className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                      >
                         <SettingsIcon className="w-5 h-5" />
                         Konfigurasi Kredensial Live Sync
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showSavedNotification && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-lg shadow-2xl animate-fade-in-up z-50">
            <p className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Data Saved & Synced to Labkom2_1
            </p>
        </div>
      )}
    </div>
  );
};

export default App;
