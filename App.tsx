
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
import { LogOut, ShieldCheck, Database, ChevronDown, CloudLightning, Share2, CheckCircle2, Globe, Key, Settings as SettingsIcon, X, Server, Wifi, Activity, Star, Monitor, Building2, MessageSquare, ArrowRight, Zap, MessageCircle, Filter, ListFilter } from 'lucide-react';

const AssetEvaluationSummary: React.FC<{ evaluations: PenilaianAset[], inventaris: Inventaris[], onReviewAsset?: (name: string) => void }> = ({ evaluations, inventaris, onReviewAsset }) => {
    const [filterCategory, setFilterCategory] = useState<'All' | 'IT' | 'Sarpras'>('All');
    const [filterRating, setFilterRating] = useState<number>(0); 

    const getCategory = (evalItem: PenilaianAset) => {
        const item = inventaris.find(inv => inv.id_barang === evalItem.id_barang || inv.nama_barang === evalItem.nama_barang);
        if (item) return item.kategori === 'IT' ? 'IT' : 'Sarpras';
        const name = evalItem.nama_barang.toLowerCase();
        if (name.includes('pc') || name.includes('komputer') || name.includes('proyektor') || name.includes('wifi') || name.includes('it')) return 'IT';
        return 'Sarpras';
    };

    const filteredList = useMemo(() => {
        return evaluations.filter(ev => {
            const catMatch = filterCategory === 'All' || getCategory(ev) === filterCategory;
            const ratMatch = filterRating === 0 || ev.skor === filterRating;
            return catMatch && ratMatch;
        });
    }, [evaluations, filterCategory, filterRating]);

    const stats = useMemo(() => {
        if (filteredList.length === 0) return { avg: "0.0", count: 0 };
        const sum = filteredList.reduce((acc, curr) => acc + curr.skor, 0);
        return {
            avg: (sum / filteredList.length).toFixed(1),
            count: filteredList.length
        };
    }, [filteredList]);

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-full max-h-[800px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    Review & Penilaian Aset
                </h3>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-black text-slate-700">{stats.avg}</span>
                    <span className="text-[10px] text-slate-400 font-bold ml-1">({stats.count})</span>
                </div>
            </div>

            <div className="space-y-4 mb-6">
                <div className="flex flex-wrap gap-2">
                    {(['All', 'IT', 'Sarpras'] as const).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                filterCategory === cat 
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {cat === 'All' ? 'Semua Kategori' : cat === 'IT' ? 'Aset IT' : 'Sarpras & Umum'}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => setFilterRating(0)}
                        className={`flex-shrink-0 px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            filterRating === 0 ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-400 border-slate-100'
                        }`}
                    >
                        Semua Rating
                    </button>
                    {[5, 4, 3, 2, 1].map(star => (
                        <button
                            key={star}
                            onClick={() => setFilterRating(star)}
                            className={`flex-shrink-0 px-3 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 transition-all ${
                                filterRating === star ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-slate-400 border-slate-100'
                            }`}
                        >
                            {star} <Star className={`w-3 h-3 ${filterRating === star ? 'fill-current' : ''}`} />
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-hide">
                {filteredList.length > 0 ? filteredList.map(ev => {
                    const category = getCategory(ev);
                    const theme = category === 'IT' 
                        ? { border: 'border-violet-100', text: 'text-violet-600', star: 'text-violet-500', bg: 'bg-violet-50' }
                        : { border: 'border-amber-100', text: 'text-amber-600', star: 'text-amber-500', bg: 'bg-amber-50' };

                    return (
                        <div key={ev.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group animate-fade-in">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-xs font-bold text-slate-800 mb-0.5">{ev.nama_barang}</p>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${theme.bg} ${theme.text} border ${theme.border}`}>
                                        {category}
                                    </span>
                                </div>
                                <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-3 h-3 ${i < ev.skor ? 'text-amber-400 fill-current' : 'text-slate-100'}`} />
                                    ))}
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-600 italic leading-relaxed mb-3">"{ev.ulasan}"</p>
                            <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-400 uppercase">
                                        {ev.nama_pengguna.charAt(0)}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">{ev.nama_pengguna}</span>
                                </div>
                                {onReviewAsset && (
                                    <button 
                                        onClick={() => onReviewAsset(ev.nama_barang)}
                                        className="text-[10px] font-bold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Ikut Review <ArrowRight className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                }) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                        <ListFilter className="w-10 h-10 text-slate-300 mb-2" />
                        <p className="text-xs text-slate-500 font-medium">Tidak ada ulasan yang sesuai filter</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const AvailableAssetCard: React.FC<{ item: Inventaris, onReview: (name: string) => void }> = ({ item, onReview }) => {
    const statusColor = item.status_barang === 'Baik' ? 'emerald' : 'amber';
    const isIT = item.kategori === 'IT';
    const Icon = isIT ? Monitor : Building2;

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-lg ${isIT ? 'bg-violet-100 text-violet-600' : 'bg-amber-100 text-amber-600'}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-${statusColor}-100 text-${statusColor}-700 border border-${statusColor}-200`}>
                    {item.status_barang}
                </span>
            </div>
            <h4 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-blue-600 transition-colors">{item.nama_barang}</h4>
            <p className="text-[10px] text-slate-400 mb-4">Lokasi: {item.id_lokasi}</p>
            <button 
                onClick={() => onReview(item.nama_barang)}
                className="w-full py-2 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 hover:border-blue-600 transition-all flex items-center justify-center gap-1.5"
            >
                <Zap className="w-3 h-3" />
                Beri Penilaian
            </button>
        </div>
    );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); 
  const [externalMessage, setExternalMessage] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

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
      
      setShowSavedNotification(true);
      setTimeout(() => setShowSavedNotification(false), 3000);
  }, []);

  const handleTriggerChatAction = useCallback((prompt: string) => {
      setExternalMessage(prompt);
      setIsChatOpen(true);
  }, []);

  const handleReviewAsset = useCallback((assetName: string) => {
      // Prompt simplified for cleaner AI logic
      const prompt = `Saya ingin memberi penilaian untuk aset: ${assetName}`;
      setExternalMessage(prompt);
      setIsChatOpen(true);
  }, []);

  if (!currentUser) return <Login onLogin={handleLogin} onRegister={handleRegister} />;

  const roleConfig = ROLE_CONFIGS[currentUser.peran];
  
  const isInternalStaff = ['admin', 'penanggung_jawab', 'pengawas_it', 'pengawas_sarpras', 'pengawas_admin'].includes(currentUser.peran);
  const isTechnicalStaff = ['penanggung_jawab'].includes(currentUser.peran);
  const isTamu = currentUser.peran === 'tamu';

  const canSeeAnalysis = isInternalStaff;
  const canSeeEvaluations = isInternalStaff || isTamu;
  const canSeeAgenda = isInternalStaff;
  const canSeePendingTickets = isInternalStaff;
  const isReadOnly = !isTechnicalStaff;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
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

      <main className="flex-1 max-w-screen-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24">
        <div className="space-y-6">
            {isTamu ? (
                <div className="animate-fade-in space-y-8">
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                        <div className="relative z-10">
                            <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                                <Globe className="w-8 h-8" />
                                Halo, {currentUser.nama_lengkap}!
                            </h2>
                            <p className="text-blue-50 text-base max-w-2xl opacity-90">
                                Bantu kami meningkatkan kualitas sekolah dengan memberikan penilaian terhadap fasilitas yang Anda gunakan hari ini. Suara Anda sangat berarti bagi kami.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-blue-600" />
                                    Aset & Fasilitas Sekolah
                                </h3>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200">Terintegrasi AI</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {inventaris.length > 0 ? inventaris.map(item => (
                                    <AvailableAssetCard key={item.id_barang} item={item} onReview={handleReviewAsset} />
                                )) : (
                                    <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-slate-400">Memuat data aset...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-6 lg:sticky lg:top-24 h-fit">
                            <AssetEvaluationSummary 
                                evaluations={evaluations} 
                                inventaris={inventaris} 
                                onReviewAsset={handleReviewAsset}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in space-y-6">
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
            )}
        </div>
      </main>

      <div className={`fixed bottom-0 right-0 z-50 p-4 sm:p-6 transition-all duration-300 ${isChatOpen ? 'w-full max-w-lg' : 'w-auto'}`}>
          {isChatOpen ? (
              <div className="h-[600px] max-h-[85vh] shadow-2xl animate-slide-up">
                  <ChatInterface 
                    user={currentUser} 
                    roleConfig={roleConfig} 
                    onDataSaved={handleDataSaved} 
                    stats={reports.filter(r => r.status === 'Pending').length} 
                    isOpen={isChatOpen} 
                    onToggle={handleToggleChat} 
                    externalMessage={externalMessage} 
                    onClearExternalMessage={() => setExternalMessage(null)} 
                  />
              </div>
          ) : (
              <button 
                onClick={() => setIsChatOpen(true)}
                className="group flex items-center gap-3 bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                  <MessageCircle className="w-6 h-6" />
                  <span className="font-bold text-sm hidden sm:inline pr-2">SIKILAT AI Assistant</span>
                  {reports.filter(r => r.status === 'Pending').length > 0 && !isTamu && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold ring-2 ring-white">
                        {reports.filter(r => r.status === 'Pending').length}
                    </span>
                  )}
              </button>
          )}
      </div>

      {showSavedNotification && (
        <div className="fixed bottom-24 right-6 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-fade-in-up z-40 border border-slate-700">
            <p className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Data Berhasil Diproses
            </p>
        </div>
      )}
    </div>
  );
};

export default App;
