
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
import { generateReplySuggestion } from './services/geminiService';
import { LogOut, ShieldCheck, Database, ChevronDown, CloudLightning, Share2, CheckCircle2, Globe, Key, Settings as SettingsIcon, X, Server, Wifi, Activity, Star, Monitor, Building2, MessageSquare, ArrowRight, Zap, MessageCircle, Filter, ListFilter, Bookmark, User as UserIcon, Sparkles, ClipboardList, ShieldAlert, Undo2, Check, Send, Sparkle, MapPin } from 'lucide-react';

// Rest of AssetEvaluationSummary remains the same ...
const AssetEvaluationSummary: React.FC<{ 
    evaluations: PenilaianAset[], 
    inventaris: Inventaris[], 
    onReviewAsset?: (name: string) => void, 
    onSaveReply: (evalId: string, reply: string) => void,
    onSaveFollowUp: (evalId: string, comment: string, rating: number) => void,
    onCompleteAction: (evalId: string, status: 'Selesai' | 'Terbuka') => void, 
    currentUser: User 
}> = ({ evaluations, inventaris, onReviewAsset, onSaveReply, onSaveFollowUp, onCompleteAction, currentUser }) => {
    const [filterCategory, setFilterCategory] = useState<'All' | 'IT' | 'Sarpras'>('All');
    const [replyingId, setReplyingId] = useState<string | null>(null);
    const [commentingId, setCommentingId] = useState<string | null>(null);
    const [interactionText, setInteractionText] = useState('');
    const [interactionRating, setInteractionRating] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);

    const isManager = ['admin', 'pengawas_admin'].includes(currentUser.peran);
    const isTamu = currentUser.peran === 'tamu';

    const getCategory = (evalItem: PenilaianAset) => {
        const item = inventaris.find(inv => inv.id_barang === evalItem.id_barang || inv.nama_barang === evalItem.nama_barang);
        if (item) return item.kategori === 'IT' ? 'IT' : 'Sarpras';
        return 'Sarpras';
    };

    const handleStartAdminReply = (ev: PenilaianAset) => {
        setReplyingId(ev.id);
        setCommentingId(null);
        setInteractionText(ev.balasan_admin || '');
    };

    const handleStartGuestComment = (ev: PenilaianAset) => {
        setCommentingId(ev.id);
        setReplyingId(null);
        setInteractionText('');
        setInteractionRating(ev.skor);
    };

    const handleAutoSuggest = async (ev: PenilaianAset) => {
        setIsGenerating(true);
        try {
            const suggestion = await generateReplySuggestion(ev.ulasan, currentUser);
            setInteractionText(suggestion);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveAdmin = (id: string) => {
        if (!interactionText.trim()) return;
        onSaveReply(id, interactionText);
        setReplyingId(null);
        setInteractionText('');
    };

    const handleSaveGuest = (id: string) => {
        if (!interactionText.trim()) return;
        onSaveFollowUp(id, interactionText, interactionRating);
        setCommentingId(null);
        setInteractionText('');
    };

    const filteredList = useMemo(() => {
        return evaluations.filter(ev => filterCategory === 'All' || getCategory(ev) === filterCategory);
    }, [evaluations, filterCategory]);

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-full max-h-[700px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
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
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-5 scrollbar-hide">
                {filteredList.length > 0 ? filteredList.map(ev => {
                    const isMyEvaluation = ev.id_pengguna === currentUser.id_pengguna;
                    const hasAdminReply = !!ev.balasan_admin;
                    const hasGuestFollowUp = !!ev.tanggapan_tamu;
                    const isResolved = ev.status_penanganan === 'Selesai';
                    const isCurrentlyAdminReplying = replyingId === ev.id;
                    const isCurrentlyGuestCommenting = commentingId === ev.id;

                    return (
                        <div key={ev.id} className={`p-5 rounded-3xl border transition-all ${isResolved ? 'bg-emerald-50/40 border-emerald-100 opacity-80' : 'bg-slate-50/50 border-slate-100 shadow-sm'} group relative`}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-black text-slate-900">{ev.nama_barang}</p>
                                        {isResolved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <MapPin className="w-3 h-3" />
                                        {ev.lokasi || 'Lokasi tidak diketahui'}
                                    </div>
                                </div>
                                <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-3.5 h-3.5 ${i < ev.skor ? 'text-amber-400 fill-current' : 'text-slate-200'}`} />
                                    ))}
                                </div>
                            </div>
                            <p className="text-[12px] text-slate-600 italic leading-relaxed mb-4 px-1 border-l-4 border-slate-200">"{ev.ulasan}"</p>
                            
                            {(hasAdminReply && !isCurrentlyAdminReplying) && (
                                <div className="ml-4 mb-4 p-4 bg-white/60 rounded-2xl border border-blue-100 shadow-sm relative animate-fade-in">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[8px] font-black">A</div>
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Balasan Admin</span>
                                        </div>
                                        <span className="text-[9px] text-slate-400 font-bold">{ev.tanggal_balasan ? new Date(ev.tanggal_balasan).toLocaleDateString() : ''}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-700 leading-relaxed">"{ev.balasan_admin}"</p>
                                </div>
                            )}

                            {(hasGuestFollowUp && !isCurrentlyGuestCommenting) && (
                                <div className="ml-4 mb-4 p-4 bg-slate-100/50 rounded-2xl border border-slate-200 shadow-sm relative animate-fade-in">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[8px] font-black">T</div>
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Komentar Lagi</span>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-700 leading-relaxed">"{ev.tanggapan_tamu}"</p>
                                </div>
                            )}

                            {isCurrentlyAdminReplying && (
                                <div className="ml-4 mb-4 space-y-3 animate-slide-up">
                                    <div className="relative group">
                                        <textarea
                                            value={interactionText}
                                            onChange={(e) => setInteractionText(e.target.value)}
                                            placeholder="Tulis balasan admin..."
                                            className="w-full text-xs p-4 rounded-2xl border border-blue-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white min-h-[100px] shadow-sm transition-all"
                                            autoFocus
                                        />
                                        <button 
                                            onClick={() => handleAutoSuggest(ev)}
                                            disabled={isGenerating}
                                            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                        >
                                            <Sparkle className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                                            Saran AI
                                        </button>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setReplyingId(null)} className="px-4 py-2 text-[10px] font-bold text-slate-400 hover:bg-slate-100 rounded-xl transition-all">Batal</button>
                                        <button onClick={() => handleSaveAdmin(ev.id)} className="px-5 py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl shadow-lg hover:bg-blue-600 flex items-center gap-2 transition-all active:scale-95">
                                            <Send className="w-3.5 h-3.5" /> Kirim Balasan
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isCurrentlyGuestCommenting && (
                                <div className="ml-4 mb-4 space-y-3 animate-slide-up bg-white p-4 rounded-2xl border border-slate-200 shadow-inner">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black text-slate-500 uppercase">Review Bintang Selanjutnya</span>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button key={star} onClick={() => setInteractionRating(star)}>
                                                    <Star className={`w-4 h-4 ${star <= interactionRating ? 'text-amber-400 fill-current' : 'text-slate-200'}`} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <textarea
                                            value={interactionText}
                                            onChange={(e) => setInteractionText(e.target.value)}
                                            placeholder="Tulis ulasan tambahan Anda..."
                                            className="w-full text-xs p-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white min-h-[100px] shadow-sm transition-all"
                                            autoFocus
                                        />
                                        <button 
                                            onClick={() => handleAutoSuggest(ev)}
                                            disabled={isGenerating}
                                            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                        >
                                            <Sparkle className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                                            Bantu AI
                                        </button>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setCommentingId(null)} className="px-4 py-2 text-[10px] font-bold text-slate-400 hover:bg-slate-100 rounded-xl transition-all">Batal</button>
                                        <button onClick={() => handleSaveGuest(ev.id)} className="px-5 py-2 bg-blue-600 text-white text-[10px] font-black rounded-xl shadow-lg hover:bg-blue-700 flex items-center gap-2 transition-all active:scale-95">
                                            <Send className="w-3.5 h-3.5" /> Kirim Komentar
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-4 border-t border-slate-200/40 mt-3">
                                 <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center text-[8px] font-black">{ev.nama_pengguna.charAt(0)}</div>
                                    <span className="text-[10px] text-slate-400 font-bold tracking-tight">Oleh: {ev.nama_pengguna}</span>
                                 </div>
                                 
                                 <div className="flex gap-2">
                                     {isManager && !isResolved && !isCurrentlyAdminReplying && (
                                        <button 
                                            onClick={() => handleStartAdminReply(ev)} 
                                            className="text-[10px] font-black text-blue-600 flex items-center gap-1.5 hover:bg-blue-50 bg-white px-3 py-1.5 rounded-xl border border-blue-50 shadow-sm transition-all active:scale-95"
                                        >
                                            <Undo2 className="w-3.5 h-3.5" /> {hasAdminReply ? 'Ubah Balasan' : 'Balas Cepat'}
                                        </button>
                                     )}

                                     {isTamu && isMyEvaluation && !isCurrentlyGuestCommenting && (
                                        <>
                                            {!isResolved ? (
                                                <div className="flex gap-2">
                                                    {hasAdminReply && (
                                                        <button 
                                                            onClick={() => onCompleteAction(ev.id, 'Selesai')} 
                                                            className="px-4 py-1.5 bg-emerald-600 text-white text-[10px] font-black rounded-xl uppercase hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                                                        >
                                                            <Check className="w-3 h-3" /> Selesaikan
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleStartGuestComment(ev)} 
                                                        className="text-[10px] font-black text-slate-500 hover:text-blue-600 border border-slate-200 px-3 py-1.5 rounded-xl bg-white shadow-sm transition-all"
                                                    >
                                                        Komentari Lagi
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase">DITUTUP</span>
                                                </div>
                                            )}
                                        </>
                                     )}
                                     
                                     {isTamu && isResolved && (
                                        <button onClick={() => onReviewAsset?.(ev.nama_barang)} className="text-[10px] font-black text-blue-600 bg-white px-3 py-1.5 rounded-xl border border-blue-50 shadow-sm hover:bg-blue-50 transition-all active:scale-95">Beri Review Baru</button>
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

  const handleSaveInlineReply = useCallback((evalId: string, reply: string) => {
      const allEvals = db.getTable('penilaian_aset');
      const target = allEvals.find(e => e.id === evalId);
      if (target) {
          target.balasan_admin = reply;
          target.tanggal_balasan = new Date();
          target.status_penanganan = 'Terbuka';
          db.addRecord('penilaian_aset', target);
          setEvaluations(db.getTable('penilaian_aset'));
          setShowSavedNotification(true);
          setTimeout(() => setShowSavedNotification(false), 3000);
      }
  }, []);

  const handleSaveFollowUp = useCallback((evalId: string, comment: string, rating: number) => {
    const allEvals = db.getTable('penilaian_aset');
    const target = allEvals.find(e => e.id === evalId);
    if (target) {
        target.tanggapan_tamu = comment;
        target.skor = rating; 
        db.addRecord('penilaian_aset', target);
        setEvaluations(db.getTable('penilaian_aset'));
        setShowSavedNotification(true);
        setTimeout(() => setShowSavedNotification(false), 3000);
    }
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

  const handleUpdateAgendaStatus = useCallback((id: string, status: 'Disetujui' | 'Ditolak', reason?: string) => {
      const allAgendas = db.getTable('agenda_kegiatan');
      const target = allAgendas.find(a => a.id === id);
      if (target) {
          target.status = status;
          target.alasan_penolakan = reason;
          target.direview_oleh = currentUser?.nama_lengkap;
          db.addRecord('agenda_kegiatan', target);
          setActivities(db.getTable('agenda_kegiatan'));
          setShowSavedNotification(true);
          setTimeout(() => setShowSavedNotification(false), 3000);
      }
  }, [currentUser]);

  if (!currentUser) return <Login onLogin={handleLogin} onRegister={handleRegister} />;

  const roleConfig = ROLE_CONFIGS[currentUser.peran];
  const isInternalStaff = ['admin', 'penanggung_jawab', 'pengawas_it', 'pengawas_sarpras', 'pengawas_admin'].includes(currentUser.peran);
  const isTamu = currentUser.peran === 'tamu';
  const isGuru = currentUser.peran === 'guru';
  const isManager = ['admin', 'pengawas_admin'].includes(currentUser.peran);

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
                    <div className="w-full">
                        <MyStatusDashboard currentUser={currentUser} reports={reports} bookings={bookings} />
                    </div>
                    
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
                        <AssetEvaluationSummary 
                            evaluations={evaluations} 
                            inventaris={inventaris} 
                            onReviewAsset={handleReviewAsset} 
                            onSaveReply={handleSaveInlineReply} 
                            onSaveFollowUp={handleSaveFollowUp}
                            onCompleteAction={handleCompleteEvaluation} 
                            currentUser={currentUser} 
                        />
                    </div>
                 </div>
            </div>
        ) : (
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
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-10">
                        {canSeeAgenda && (
                            <AgendaActivityTable 
                                activities={activities} 
                                currentUserRole={currentUser.peran} 
                                onUpdateStatus={handleUpdateAgendaStatus}
                            />
                        )}
                        {canSeeAnalysis && <DamageReportChart reports={reports} onProcessAction={handleTriggerChatAction} isReadOnly={isReadOnly} />}
                        {canSeePendingTickets && <PendingTicketTable reports={reports} onProcessAction={handleTriggerChatAction} isReadOnly={isReadOnly} />}
                    </div>

                    <div className="space-y-10">
                        {canSeeEvaluations && <AssetEvaluationSummary 
                            evaluations={evaluations} 
                            inventaris={inventaris} 
                            onSaveReply={handleSaveInlineReply} 
                            onSaveFollowUp={handleSaveFollowUp}
                            onCompleteAction={handleCompleteEvaluation} 
                            currentUser={currentUser} 
                        />}
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
