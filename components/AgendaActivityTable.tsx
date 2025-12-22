
import React, { useState, useMemo } from 'react';
import { AgendaKegiatan, UserRole } from '../types';
import { Calendar, CheckCircle2, Clock, MapPin, User, ChevronLeft, ChevronRight, CheckSquare, XCircle, Search, AlertTriangle, ChevronDown, ChevronUp, MessageSquare, ShieldAlert, X } from 'lucide-react';

interface AgendaActivityTableProps {
  activities: AgendaKegiatan[];
  onUpdateStatus?: (id: string, status: 'Disetujui' | 'Ditolak', reason?: string) => void;
  onApproveAllToday?: () => void;
  currentUserRole: UserRole;
}

const AgendaActivityTable: React.FC<AgendaActivityTableProps> = ({ 
    activities, 
    onUpdateStatus, 
    onApproveAllToday,
    currentUserRole 
}) => {
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Disetujui' | 'Ditolak'>('All');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  
  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedAgendaId, setSelectedAgendaId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Role Checks
  const isSupervisor = ['pengawas_it', 'pengawas_sarpras', 'admin'].includes(currentUserRole);
  const isPJ = currentUserRole === 'penanggung_jawab';

  // Conflict Detection
  const findConflicts = (activity: AgendaKegiatan, all: AgendaKegiatan[]) => {
      return all.filter(a => 
          a.id !== activity.id &&
          a.posisi === activity.posisi &&
          a.status === 'Disetujui' &&
          new Date(a.waktu_mulai).getTime() < new Date(activity.waktu_selesai).getTime() &&
          new Date(a.waktu_selesai).getTime() > new Date(activity.waktu_mulai).getTime()
      );
  };

  const groupedData = useMemo(() => {
    let filtered = activities;
    if (filterStatus !== 'All') {
        filtered = activities.filter(a => a.status === filterStatus);
    }

    const groups: Record<string, AgendaKegiatan[]> = {};
    filtered.forEach(activity => {
        const dateKey = new Date(activity.waktu_mulai).toDateString();
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(activity);
    });

    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [activities, filterStatus]);

  const toggleDate = (date: string) => {
      setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const handleOpenReject = (id: string) => {
      setSelectedAgendaId(id);
      setRejectionReason("");
      setRejectModalOpen(true);
  };

  const confirmReject = () => {
      if (selectedAgendaId && onUpdateStatus) {
          onUpdateStatus(selectedAgendaId, 'Ditolak', rejectionReason || "Kegiatan tidak sesuai dengan kriteria fasilitas.");
          setRejectModalOpen(false);
      }
  };

  const formatTime = (dateStr: string | Date) => {
      return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDateLabel = (dateStr: string) => {
      const d = new Date(dateStr);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return 'Hari Ini';
      return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
      <div className="p-5 border-b bg-indigo-50/30 border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Agenda Operasional Harian
            </h3>
            <p className="text-xs text-slate-500 font-medium">Monitoring utilisasi ruangan dan pemeliharaan alat.</p>
        </div>
        
        <div className="flex items-center gap-3">
            {isSupervisor && (
                <div className="hidden lg:flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-200 text-[10px] font-black uppercase tracking-widest">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Reviewer Mode
                </div>
            )}
            
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(['All', 'Pending', 'Disetujui', 'Ditolak'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filterStatus === status ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {status}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {groupedData.length > 0 ? groupedData.map(([date, dateActivities]) => (
            <div key={date} className="space-y-2">
                <button 
                    onClick={() => toggleDate(date)}
                    className="flex items-center justify-between w-full py-2.5 px-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{formatDateLabel(date)}</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">{dateActivities.length} Agenda</span>
                    </div>
                    {expandedDates[date] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {!expandedDates[date] && (
                    <div className="space-y-3 pl-2 animate-fade-in mt-2">
                        {dateActivities.map(item => {
                            const conflicts = findConflicts(item, activities);
                            const hasConflict = conflicts.length > 0;
                            const statusColor = item.status === 'Disetujui' ? 'bg-emerald-500' : item.status === 'Ditolak' ? 'bg-rose-500' : 'bg-amber-500';

                            return (
                                <div key={item.id} className={`flex flex-col md:flex-row gap-4 p-4 rounded-2xl border transition-all ${item.status === 'Ditolak' ? 'bg-rose-50/30 border-rose-100' : 'bg-white border-slate-100'} hover:shadow-md group relative`}>
                                    <div className="flex-shrink-0 flex md:flex-col items-center justify-center md:border-r border-slate-100 md:pr-4 min-w-[90px]">
                                        <div className="text-xs font-black text-slate-900">{formatTime(item.waktu_mulai)}</div>
                                        <div className="h-4 w-px bg-slate-200 hidden md:block my-1"></div>
                                        <div className="text-[10px] font-bold text-slate-400">{formatTime(item.waktu_selesai)}</div>
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800">{item.uraian_kegiatan}</h4>
                                                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                                        <MapPin className="w-3 h-3" /> {item.posisi}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                                        <User className="w-3 h-3" /> {item.nama_pj}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white ${statusColor}`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                        </div>

                                        {item.status === 'Ditolak' && item.alasan_penolakan && (
                                            <div className="p-3 bg-rose-100/50 rounded-xl border border-rose-200 flex items-start gap-3 mt-2 animate-fade-in">
                                                <div className="p-1.5 bg-white rounded-full text-rose-600 shadow-sm">
                                                    <MessageSquare className="w-3 h-3" />
                                                </div>
                                                <div className="text-[10px] text-rose-800">
                                                    <p className="font-black uppercase tracking-wider mb-0.5">Dibalas Pengawas:</p>
                                                    <p className="italic font-medium leading-relaxed">"{item.alasan_penolakan}"</p>
                                                </div>
                                            </div>
                                        )}

                                        {hasConflict && item.status === 'Pending' && (
                                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3 mt-2">
                                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                                <p className="text-[10px] text-amber-700 font-medium leading-relaxed">Bentrok terdeteksi dengan agenda {conflicts[0].nama_pj}.</p>
                                            </div>
                                        )}

                                        {isSupervisor && item.status === 'Pending' && onUpdateStatus && (
                                            <div className="flex gap-2 pt-3">
                                                <button 
                                                    onClick={() => onUpdateStatus(item.id, 'Disetujui')}
                                                    className="flex-1 py-1.5 bg-emerald-600 text-white text-[10px] font-black rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 active:scale-95"
                                                >
                                                    <CheckSquare className="w-3.5 h-3.5" /> SETUJUI
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenReject(item.id)}
                                                    className="flex-1 py-1.5 bg-white border-2 border-rose-200 text-rose-600 text-[10px] font-black rounded-xl hover:bg-rose-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" /> TOLAK AGENDA
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <Search className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">Tidak ada agenda operasional.</p>
            </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-slide-up">
                  <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-rose-100 text-rose-600 rounded-2xl">
                              <XCircle className="w-6 h-6" />
                          </div>
                          <div>
                              <h3 className="text-lg font-black text-slate-900">Penolakan Agenda</h3>
                              <p className="text-xs text-slate-500">Berikan alasan agar PJ dapat memperbaiki agenda.</p>
                          </div>
                      </div>
                      <button onClick={() => setRejectModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                          <X className="w-5 h-5 text-slate-400" />
                      </button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Alasan Pengawas</label>
                          <textarea 
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Contoh: Lokasi tersebut sedang dalam perbaikan besar, silakan pindahkan agenda ke ruangan lain..."
                            className="w-full h-32 p-4 text-xs font-medium border-2 border-slate-100 rounded-2xl focus:border-rose-500 focus:outline-none bg-slate-50 transition-all resize-none"
                            autoFocus
                          />
                      </div>
                      
                      <div className="flex gap-3 pt-2">
                          <button 
                            onClick={() => setRejectModalOpen(false)}
                            className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-2xl transition-all"
                          >
                              Batal
                          </button>
                          <button 
                            onClick={confirmReject}
                            className="flex-[2] py-3 bg-rose-600 text-white text-xs font-black rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-200 transition-all active:scale-95"
                          >
                              Kirim Penolakan
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AgendaActivityTable;
