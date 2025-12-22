
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
import { LogOut, ShieldCheck, Database, ChevronDown, CloudLightning, Share2, CheckCircle2, Globe, Key, Settings as SettingsIcon, X, Server, Wifi, Activity, Star, Monitor, Building2, MessageSquare, ArrowRight, Zap, MessageCircle, Filter, ListFilter, Bookmark, User as UserIcon, Sparkles, ClipboardList, ShieldAlert, Undo2, Check } from 'lucide-react';

const AssetEvaluationSummary: React.FC<{ evaluations: PenilaianAset[], inventaris: Inventaris[], onReviewAsset?: (name: string) => void, onReplyAction?: (evalId: string, assetName: string) => void, onCompleteAction?: (evalId: string, status: 'Selesai' | 'Terbuka') => void, currentUser: User }> = ({ evaluations, inventaris, onReviewAsset, onReplyAction, onCompleteAction, currentUser }) => {
    const [filterCategory, setFilterCategory] = useState<'All' | 'IT' | 'Sarpras'>('All');

    const isManager = ['admin', 'pengawas_admin'].includes(currentUser.peran);
    const isTamu = currentUser.peran === 'tamu';

    const getCategory = (evalItem: PenilaianAset) => {
        const item = inventaris.find(inv => inv.id_barang === evalItem.id_barang || inv.nama_barang === evalItem.nama_barang);
        if (item) return item.kategori === 'IT' ? 'IT' : 'Sarpras';
        return 'Sarpras';
    };

    const filteredList = useMemo(() => {
        return evaluations.filter(ev => filterCategory === 'All' || getCategory(ev) === filterCategory);
    }, [evaluations, filterCategory]);

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-full max-h-[700px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    Review & Penilaian Aset
                </h3>
                {isManager && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-full border border-slate-100">Panel Pengawas</span>}
            </div>

            <div className="flex gap-2 mb-6">
                {(['All', 'IT', 'Sarpras'] as const).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                            filterCategory === cat 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-white text-slate-500 border-slate-200'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-hide">
                {filteredList.length > 0 ? filteredList.map(ev => {
                    const isMyEvaluation = ev.id_pengguna === currentUser.id_pengguna;
                    const hasAdminReply = !!ev.balasan_admin;
                    const isResolved = ev.status_penanganan === 'Selesai';

                    return (
                        <div key={ev.id} className={`p-4 rounded-2xl border transition-all group ${isResolved ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50/50 border-slate-100'} hover:shadow-md`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold text-slate-800">{ev.nama_barang}</p>
                                    {isResolved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                </div>
                                <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-3 h-3 ${i < ev.skor ? 'text-amber-400 fill-current' : 'text-slate-200'}`} />
                                    ))}
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-600 italic leading-relaxed mb-3">"{ev.ulasan}"</p>
                            
                            {/* BALASAN ADMIN */}
                            {hasAdminReply && (
                                <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100 relative">
                                    <div className="absolute -top-2 left-4 px-2 bg-blue-100 text-[8px] font-black text-blue-600 uppercase tracking-widest rounded border border-blue-200">Balasan Admin</div>
                                    <p className="text-[10px] text-blue-800 leading-relaxed">"{ev.balasan_admin}"</p>
                                    <p className="text-[8px] text-blue-400 mt-1 font-bold">{ev.tanggal_balasan ? new Date(ev.tanggal_balasan).toLocaleDateString() : ''}</p>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                 <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">Oleh: {ev.nama_pengguna}</span>
                                 
                                 <div className="flex gap-2">
                                     {/* Admin Action: Reply */}
                                     {isManager && !isResolved && (
                                        <button 
                                            onClick={() => onReplyAction?.(ev.id, ev.nama_barang)} 
                                            className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline"
                                        >
                                            <Undo2 className="w-3 h-3" /> Balas
                                        </button>
                                     )}

                                     {/* Tamu Action: Complete or Re-open */}
                                     {isTamu && isMyEvaluation && hasAdminReply && (
                                        <>
                                            {!isResolved ? (
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => onCompleteAction?.(ev.id, 'Selesai')} 
                                                        className="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-black rounded uppercase hover:bg-emerald-700 transition-colors flex items-center gap-1"
                                                    >
                                                        <Check className="w-2.5 h-2.5" /> Selesai
                                                    </button>
                                                    <button 
                                                        onClick={() => onReviewAsset?.(ev.nama_barang)} 
                                                        className="text-[9px] font-bold text-slate-500 hover:text-blue-600"
                                                    >
                                                        Lanjut Tanya
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1">
                                                    <CheckCircle2 className="w-2.5 h-2.5" /> Ditutup
                                                </span>
                                            )}
                                        </>
                                     )}
                                     
                                     {/* Tamu Action: Create New Review */}
                                     {isTamu && !hasAdminReply && (
                                        <button onClick={() => onReviewAsset?.(ev.nama_barang)} className="text-[10px] font-bold text-blue-600">Beri Review</button>
                                     )}
                                 </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                        <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                        <p className="text-sm font-medium">Belum ada penilaian.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const AvailableAssetCard: React.FC<{ item: Inventaris, onReview?: (name: string) => void }> = ({ item, onReview }) => {
    const isIT = item.kategori === 'IT';
    const Icon = isIT ? Monitor : Building2;

    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl transition-colors ${isIT ? 'bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white' : 'bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 text-sm">{item.nama_barang}</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{item.kategori}</p>
                </div>
            </div>
            <div className="flex justify-between items-center mt-4">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{item.id_lokasi}</span>
                {onReview && (
                    <button 
                        onClick={() => onReview(item.nama_barang)}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    >
                        <Star className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); 
  const [externalMessage, setExternalMessage] = useState<string | null>(null);

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
      const prompt = `Saya ingin memberi penilaian untuk aset: ${assetName}`;
      setExternalMessage(prompt);
      setIsChatOpen(true);
  }, []);

  const handleReplyToEvaluation = useCallback((evalId: string, assetName: string) => {
      const prompt = `Saya ingin membalas penilaian aset (ID: ${evalId}) untuk: ${assetName}`;
      setExternalMessage(prompt);
      setIsChatOpen(true);
  }, []);

  const handleCompleteEvaluation = useCallback((evalId: string, status: 'Selesai' | 'Terbuka') => {
      const allEvals = db.getTable('penilaian_aset');
      const target = allEvals.find(e => e.id === evalId);
      if (target) {
          target.status_penanganan = status;
          db.addRecord('penilaian_aset', target);
          setEvaluations(db.getTable('penilaian_aset'));
          setShowSavedNotification(true);
          setTimeout(() => setShowSavedNotification(false), 3000);
      }
  }, []);

  if (!currentUser) return <Login onLogin={handleLogin} onRegister={handleRegister} />;

  const roleConfig = ROLE_CONFIGS[currentUser.peran];
  const isInternalStaff = ['admin', 'penanggung_jawab', 'pengawas_it', 'pengawas_sarpras', 'pengawas_admin'].includes(currentUser.peran);
  const isTamu = currentUser.peran === 'tamu';
  const isGuru = currentUser.peran === 'guru';
  const isManager = ['admin', 'pengawas_admin'].includes(currentUser.peran);

  // RESTRICT ACCESS TO REVIEWS: ONLY TAMU (FILL) & ADMINS (MONITOR)
  const canSeeEvaluations = isTamu || isManager;
  
  const canSeeAnalysis = isInternalStaff && !isGuru;
  const canSeeAgenda = isInternalStaff && !isGuru;
  const canSeePendingTickets = isInternalStaff && !isGuru;
  const isReadOnly = !['penanggung_jawab', 'admin'].includes(currentUser.peran);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-slate-200"> S </div>
             <span className="font-bold text-slate-800 text-lg tracking-tight">SIKILAT SMP 6 Pekalongan</span>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setIsProfileMenuOpen(prev => !prev)} className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                <img src={currentUser.avatar} alt="Profile" className="w-9 h-9 rounded-full ring-2 ring-slate-100"/>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
             </button>
             {isProfileMenuOpen && (
                <div className="absolute right-8 top-16 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden py-2 animate-fade-in-up">
                   <div className="px-4 py-3 border-b mb-1 bg-slate-50/50">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{roleConfig.label}</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{currentUser.nama_lengkap}</p>
                   </div>
                   <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 font-bold transition-colors">
                      <LogOut className="w-4 h-4"/> Keluar
                   </button>
                </div>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-32">
        {isGuru ? (
            /* SPECIAL GURU LAYOUT - CENTERED & BALANCED */
            <div className="animate-fade-in space-y-8 max-w-4xl mx-auto">
                <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 rounded-[3rem] p-10 shadow-2xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-[100px]"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-32 -mb-32 blur-[80px]"></div>
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-white/20 backdrop-blur-md">
                            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                            Workspace Guru & Staf
                        </div>
                        <h2 className="text-5xl font-black mb-4 leading-tight">Halo, Bapak/Ibu <br/>{currentUser.nama_lengkap.split(' ')[0]}</h2>
                        <p className="text-blue-100/80 text-lg max-w-xl leading-relaxed font-medium">
                            Pantau status laporan kerusakan dan peminjaman inventaris Anda secara real-time. Hubungi asisten AI untuk bantuan instan.
                        </p>
                    </div>
                </div>

                <div className="space-y-10">
                    {/* Status Utama */}
                    <div className="w-full">
                        <MyStatusDashboard currentUser={currentUser} reports={reports} bookings={bookings} />
                    </div>
                    
                    {/* Inventaris Cepat */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <h3 className="font-black text-slate-800 text-xl flex items-center gap-3">
                                <Monitor className="w-6 h-6 text-blue-600" />
                                Akses Cepat Inventaris
                            </h3>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total {inventaris.length} Aset</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                            {inventaris.slice(0, 4).map(item => (
                                <AvailableAssetCard key={item.id_barang} item={item} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        ) : isTamu ? (
            /* SPECIAL TAMU LAYOUT */
            <div className="animate-fade-in space-y-8 max-w-6xl mx-auto">
                 <div className="bg-white rounded-[3rem] p-12 shadow-xl border border-slate-100 flex flex-col md:flex-row items-center gap-10">
                    <div className="w-28 h-28 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner">
                        <Globe className="w-14 h-14" />
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Pusat Layanan Tamu</h2>
                        <p className="text-slate-500 font-medium text-lg leading-relaxed">Berikan penilaian Anda terhadap fasilitas sekolah kami untuk membantu kami terus berkembang.</p>
                    </div>
                    <button onClick={() => setIsChatOpen(true)} className="px-10 py-5 bg-slate-900 text-white font-black rounded-3xl shadow-2xl hover:bg-blue-600 active:scale-95 transition-all text-lg flex items-center gap-3">
                        <MessageCircle className="w-6 h-6" /> Hubungi AI
                    </button>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-8">
                         <h3 className="font-black text-slate-800 text-2xl flex items-center gap-3">Pilih Aset untuk Dinilai</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {inventaris.map(item => (
                                <AvailableAssetCard key={item.id_barang} item={item} onReview={handleReviewAsset} />
                            ))}
                         </div>
                    </div>
                    <div className="h-fit lg:sticky lg:top-24">
                        <AssetEvaluationSummary evaluations={evaluations} inventaris={inventaris} onReviewAsset={handleReviewAsset} onReplyAction={handleReplyToEvaluation} onCompleteAction={handleCompleteEvaluation} currentUser={currentUser} />
                    </div>
                 </div>
            </div>
        ) : (
            /* STAFF & ADMIN LAYOUT (Cluster Monitor) */
            <div className="animate-fade-in space-y-8">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className={`p-5 rounded-3xl bg-${roleConfig.color}-50 text-${roleConfig.color}-600 border border-${roleConfig.color}-100 shadow-sm`}>
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Operational Cluster</h2>
                            <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Logged as {roleConfig.label}
                            </p>
                        </div>
                    </div>
                    <div className="hidden xl:flex gap-8">
                         <div className="text-right">
                             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Status Sistem</p>
                             <p className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase">Optimal</p>
                         </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-10">
                        {canSeeAgenda && <AgendaActivityTable activities={activities} currentUserRole={currentUser.peran} />}
                        {canSeeAnalysis && <DamageReportChart reports={reports} onProcessAction={handleTriggerChatAction} isReadOnly={isReadOnly} />}
                        {canSeePendingTickets && <PendingTicketTable reports={reports} onProcessAction={handleTriggerChatAction} isReadOnly={isReadOnly} />}
                    </div>

                    <div className="space-y-10">
                        {canSeeEvaluations && <AssetEvaluationSummary evaluations={evaluations} inventaris={inventaris} onReplyAction={handleReplyToEvaluation} onCompleteAction={handleCompleteEvaluation} currentUser={currentUser} />}
                        <MyStatusDashboard currentUser={currentUser} reports={reports} bookings={bookings} activities={activities} />
                    </div>
                </div>
            </div>
        )}
      </main>

      {/* FLOATING AI ASSISTANT */}
      <div className={`fixed bottom-0 right-0 z-50 p-6 transition-all duration-300 ${isChatOpen ? 'w-full max-w-lg' : 'w-auto'}`}>
          {isChatOpen ? (
              <div className="h-[650px] max-h-[85vh] shadow-2xl animate-slide-up">
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
              <button onClick={() => setIsChatOpen(true)} className="group flex items-center gap-3 bg-slate-900 text-white p-5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all relative border-4 border-white">
                  <MessageCircle className="w-7 h-7" />
                  <span className="font-black text-base hidden sm:inline pr-2 tracking-tight">SIKILAT AI</span>
                  {reports.filter(r => r.status === 'Pending').length > 0 && isInternalStaff && !isGuru && (
                    <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-[11px] font-black ring-4 ring-white shadow-lg text-white">
                        {reports.filter(r => r.status === 'Pending').length}
                    </span>
                  )}
              </button>
          )}
      </div>

      {showSavedNotification && (
        <div className="fixed bottom-28 right-8 bg-slate-900 text-white px-8 py-5 rounded-[2rem] shadow-2xl animate-fade-in-up z-40 border border-slate-700">
            <p className="text-base font-black flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Data Berhasil Diproses
            </p>
        </div>
      )}
    </div>
  );
};

export default App;
