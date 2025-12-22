
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import MyStatusDashboard from './components/MyStatusDashboard';
import DamageReportChart from './components/DamageReportChart';
import PendingTicketTable from './components/PendingTicketTable';
import AgendaActivityTable from './components/AgendaActivityTable'; 
import { ROLE_CONFIGS } from './constants';
import { User, UserRole, SavedData, PengaduanKerusakan, PeminjamanAntrian, Pengguna, Lokasi, Inventaris, AgendaKegiatan, PenilaianAset } from './types';
import db from './services/dbService'; 
import { LogOut, ShieldCheck, Database, ChevronDown, CloudLightning, Share2, CheckCircle2, Globe, Key, Settings as SettingsIcon, X, Server, Wifi, Activity, Star, Monitor, Building2 } from 'lucide-react';

const AssetEvaluationSummary = ({ evaluations, inventaris }: { evaluations: PenilaianAset[], inventaris: Inventaris[] }) => {
    if (evaluations.length === 0) return null;

    // Helper to get category of an asset
    const getCategory = (evalItem: PenilaianAset) => {
        const item = inventaris.find(inv => inv.id_barang === evalItem.id_barang || inv.nama_barang === evalItem.nama_barang);
        if (item) return item.kategori;
        // Fallback detection for manual entries from AI
        const name = evalItem.nama_barang.toLowerCase();
        if (name.includes('pc') || name.includes('komputer') || name.includes('proyektor') || name.includes('wifi') || name.includes('it')) return 'IT';
        return 'Sarpras';
    };

    const itEvals = evaluations.filter(e => getCategory(e) === 'IT');
    const sarprasEvals = evaluations.filter(e => getCategory(e) !== 'IT');

    const renderEvalList = (list: PenilaianAset[], title: string, color: 'violet' | 'amber', Icon: any) => {
        const avg = list.length > 0 ? (list.reduce((a, b) => a + b.skor, 0) / list.length).toFixed(1) : "0.0";
        const colorClasses = {
            violet: { border: 'border-violet-100', bg: 'bg-violet-50', text: 'text-violet-600', star: 'text-violet-500' },
            amber: { border: 'border-amber-100', bg: 'bg-amber-50', text: 'text-amber-600', star: 'text-amber-500' }
        };
        const theme = colorClasses[color];

        return (
            <div className={`space-y-4 p-4 rounded-2xl border ${theme.border} ${theme.bg}/30`}>
                <div className="flex justify-between items-center">
                    <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${theme.text}`}>
                        <Icon className="w-4 h-4" />
                        {title}
                    </h4>
                    <div className="flex items-center gap-1">
                        <Star className={`w-3 h-3 fill-current ${theme.star}`} />
                        <span className="text-sm font-black text-slate-700">{avg}</span>
                    </div>
                </div>
                
                <div className="space-y-3">
                    {list.length > 0 ? list.slice(0, 3).map(ev => (
                        <div key={ev.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-start mb-1">
                                <p className="text-[11px] font-bold text-slate-700 truncate w-2/3">{ev.nama_barang}</p>
                                <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-2.5 h-2.5 ${i < ev.skor ? theme.star + ' fill-current' : 'text-slate-200'}`} />
                                    ))}
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 italic line-clamp-2 leading-relaxed">"{ev.ulasan}"</p>
                        </div>
                    )) : (
                        <p className="text-[10px] text-slate-400 italic text-center py-4">Belum ada penilaian kategori ini</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                Review & Penilaian Aset
            </h3>
            
            <div className="grid grid-cols-1 gap-6">
                {renderEvalList(itEvals, "Review Aset IT", "violet", Monitor)}
                {renderEvalList(sarprasEvals, "Review Sarpras & Umum", "amber", Building2)}
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [externalMessage, setExternalMessage] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [cloudConfig, setCloudConfig] = useState<{endpoint: string, user: string} | null>(db.getCloudConfig());
  const [isSyncing, setIsSyncing] = useState(false);

  const [bookings, setBookings] = useState<PeminjamanAntrian[]>([]);
  const [reports, setReports] = useState<PengaduanKerusakan[]>([]);
  const [evaluations, setEvaluations] = useState<PenilaianAset[]>([]);
  const [inventaris, setInventaris] = useState<Inventaris[]>([]);
  const [activities, setActivities] = useState<AgendaKegiatan[]>([]); 
  
  useEffect(() => {
      setBookings(db.getTable('peminjaman_antrian'));
      setReports(db.getTable('pengaduan_kerusakan'));
      setEvaluations(db.getTable('penilaian_aset'));
      setInventaris(db.getTable('inventaris'));
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
      else if (data.table === 'penilaian_aset') setEvaluations(db.getTable('penilaian_aset'));
      else if (data.table === 'agenda_kegiatan') setActivities(db.getTable('agenda_kegiatan'));
      
      if (cloudConfig) {
          setIsSyncing(true);
          setTimeout(() => setIsSyncing(false), 1500);
      }

      setShowSavedNotification(true);
      setTimeout(() => setShowSavedNotification(false), 3000);
  }, [cloudConfig]);

  const handleTriggerChatAction = useCallback((prompt: string) => {
      setExternalMessage(prompt);
      setIsChatOpen(true);
  }, []);

  if (!currentUser) return <Login onLogin={handleLogin} onRegister={handleRegister} />;

  const roleConfig = ROLE_CONFIGS[currentUser.peran];
  
  // Update internal staff list to include new Pengawas roles
  const isInternalStaff = [
    'admin', 
    'penanggung_jawab', 
    'pengawas_it', 
    'pengawas_sarpras', 
    'pengawas_admin'
  ].includes(currentUser.peran);
  
  // Only the person who actually works on it is Technical Staff
  const isTechnicalStaff = ['penanggung_jawab'].includes(currentUser.peran);
  
  const canSeeAnalysis = isInternalStaff && currentUser.peran !== 'tamu';
  const canSeeEvaluations = isInternalStaff;
  const canSeeAgenda = isInternalStaff && currentUser.peran !== 'tamu';
  const canSeePendingTickets = isInternalStaff; // All staff can see, but only tech can take action
  const isReadOnly = !isTechnicalStaff; // Only PJ has write access to technical execution

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm"> S </div>
             <span className="font-bold text-slate-800 text-lg">SIKILAT SMP 6 Pekalongan</span>
          </div>
          <div className="flex items-center gap-2" ref={profileMenuRef}>
             <button onClick={() => setIsProfileMenuOpen(prev => !prev)} className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <img src={currentUser.avatar} alt="Profile" className="w-10 h-10 rounded-full"/>
                <ChevronDown className={`w-4 h-4 text-slate-500 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
             </button>
             {isProfileMenuOpen && (
                <div className="absolute right-0 mt-12 w-56 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden">
                   <div className="p-3 border-b bg-slate-50/50">
                        <p className="text-sm font-semibold text-slate-700 truncate">{currentUser.nama_lengkap}</p>
                   </div>
                   <div className="p-2">
                      <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-md transition-colors"><LogOut className="w-4 h-4"/> Keluar</button>
                   </div>
                </div>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="space-y-6">
            {currentUser.peran === 'tamu' ? (
                <div className="bg-gradient-to-r from-cyan-600 to-blue-700 rounded-2xl p-6 shadow-md text-white">
                    <h2 className="text-2xl font-bold mb-2">Layanan Pengunjung & Tamu</h2>
                    <p className="text-blue-100 text-sm max-w-2xl">Bantu kami meningkatkan kualitas sekolah dengan memberikan **Penilaian/Evaluasi** terhadap fasilitas yang Anda gunakan.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full bg-${roleConfig.color}-100 text-${roleConfig.color}-600`}>
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Operational Cluster</h2>
                            <p className="text-slate-600 text-sm">Cluster Status: <span className="text-emerald-600 font-bold uppercase text-[10px]">Active</span></p>
                            <p className="text-xs text-slate-400 mt-1">Logged in as: <span className="font-bold">{roleConfig.label}</span></p>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {canSeeAgenda && (
                        <AgendaActivityTable 
                          activities={activities} 
                          currentUserRole={currentUser.peran} 
                        />
                    )}

                    {canSeeAnalysis && (
                        <DamageReportChart reports={reports} onProcessAction={handleTriggerChatAction} isReadOnly={isReadOnly} />
                    )}

                    {canSeePendingTickets && (
                        <PendingTicketTable reports={reports} onProcessAction={handleTriggerChatAction} isReadOnly={isReadOnly} />
                    )}
                </div>

                <div className="space-y-6">
                    {canSeeEvaluations && <AssetEvaluationSummary evaluations={evaluations} inventaris={inventaris} />}
                    <MyStatusDashboard currentUser={currentUser} reports={reports} bookings={bookings} activities={activities} />
                </div>
            </div>
        </div>

        <ChatInterface user={currentUser} roleConfig={roleConfig} onDataSaved={handleDataSaved} stats={reports.filter(r => r.status === 'Pending').length} isOpen={isChatOpen} onToggle={handleToggleChat} externalMessage={externalMessage} onClearExternalMessage={() => setExternalMessage(null)} />
      </main>

      {showSavedNotification && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-lg shadow-2xl animate-fade-in-up z-50">
            <p className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Data Saved & Processed
            </p>
        </div>
      )}
    </div>
  );
};

export default App;
