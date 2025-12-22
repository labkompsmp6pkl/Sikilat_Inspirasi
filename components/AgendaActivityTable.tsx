
import React, { useState, useMemo } from 'react';
import { AgendaKegiatan, UserRole } from '../types';
import { Calendar, CheckCircle2, Clock, MapPin, User, ChevronLeft, ChevronRight, CheckSquare, XCircle, Search, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface AgendaActivityTableProps {
  activities: AgendaKegiatan[];
  onUpdateStatus?: (id: string, status: 'Disetujui' | 'Ditolak') => void;
  onApproveAllToday?: () => void;
  currentUserRole: UserRole;
}

const AgendaActivityTable: React.FC<AgendaActivityTableProps> = ({ 
    activities, 
    onUpdateStatus, 
    onApproveAllToday,
    currentUserRole 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Disetujui'>('All');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const itemsPerPage = 8;

  // Conflict Detection: Overlapping time slots in the same location
  const findConflicts = (activity: AgendaKegiatan, all: AgendaKegiatan[]) => {
      return all.filter(a => 
          a.id !== activity.id &&
          a.posisi === activity.posisi &&
          a.status !== 'Ditolak' &&
          new Date(a.waktu_mulai).getTime() < new Date(activity.waktu_selesai).getTime() &&
          new Date(a.waktu_mulai).getTime() >= new Date(activity.waktu_mulai).getTime() ||
          (new Date(a.waktu_selesai).getTime() > new Date(activity.waktu_mulai).getTime() && 
           new Date(a.waktu_selesai).getTime() <= new Date(activity.waktu_selesai).getTime())
      );
  };

  // Grouping and Filtering
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

    // Sort within groups by time
    Object.keys(groups).forEach(key => {
        groups[key].sort((a, b) => new Date(a.waktu_mulai).getTime() - new Date(b.waktu_mulai).getTime());
    });

    // Sort groups by date descending
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [activities, filterStatus]);

  const canApprove = ['penanggung_jawab', 'pengawas_it', 'pengawas_sarpras'].includes(currentUserRole);

  const pendingTodayCount = activities.filter(a => {
      const isToday = new Date(a.waktu_mulai).toDateString() === new Date().toDateString();
      return a.status === 'Pending' && isToday;
  }).length;

  const toggleDate = (date: string) => {
      setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const formatTime = (dateStr: string | Date) => {
      return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDateLabel = (dateStr: string) => {
      const d = new Date(dateStr);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return 'Hari Ini';
      today.setDate(today.getDate() - 1);
      if (d.toDateString() === today.toDateString()) return 'Kemarin';
      return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  if (activities.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-5 border-b bg-indigo-50/30 border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Agenda Operasional Harian
            </h3>
            <p className="text-xs text-slate-500 font-medium">Monitoring utilisasi ruangan dan pemeliharaan alat.</p>
        </div>
        
        <div className="flex items-center gap-3">
            {canApprove && pendingTodayCount > 0 && (
                <button 
                    onClick={onApproveAllToday}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[11px] font-black rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                >
                    <CheckSquare className="w-4 h-4" />
                    APPROVE ALL TODAY ({pendingTodayCount})
                </button>
            )}
            
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(['All', 'Pending', 'Disetujui'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => { setFilterStatus(status); setCurrentPage(1); }}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterStatus === status ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {status === 'All' ? 'Semua' : status}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {groupedData.length > 0 ? groupedData.map(([date, dateActivities]) => (
            <div key={date} className="space-y-3">
                <button 
                    onClick={() => toggleDate(date)}
                    className="flex items-center justify-between w-full py-2 px-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{formatDateLabel(date)}</span>
                        <div className="h-px w-8 bg-slate-200"></div>
                        <span className="text-xs font-bold text-slate-500">{dateActivities.length} Kegiatan</span>
                    </div>
                    {expandedDates[date] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {!expandedDates[date] && (
                    <div className="space-y-3 pl-4 animate-fade-in">
                        {dateActivities.map(item => {
                            const conflicts = findConflicts(item, activities);
                            const hasConflict = conflicts.length > 0;

                            return (
                                <div key={item.id} className={`group flex flex-col md:flex-row gap-4 p-4 rounded-2xl border transition-all ${hasConflict && item.status === 'Pending' ? 'bg-rose-50 border-rose-100 shadow-sm' : 'bg-white border-slate-100 hover:shadow-md'}`}>
                                    {/* Timeline indicator */}
                                    <div className="flex-shrink-0 flex md:flex-col items-center justify-center md:border-r border-slate-100 md:pr-4 min-w-[100px]">
                                        <div className="text-xs font-black text-slate-900">{formatTime(item.waktu_mulai)}</div>
                                        <div className="h-4 w-px bg-slate-200 hidden md:block my-1"></div>
                                        <div className="text-[10px] font-bold text-slate-400">{formatTime(item.waktu_selesai)}</div>
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{item.uraian_kegiatan}</h4>
                                                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                                        <MapPin className="w-3 h-3" /> {item.posisi}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                                        <User className="w-3 h-3" /> {item.nama_pj || 'Staff'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {item.status === 'Pending' ? (
                                                    <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-600 border border-amber-200">Pending</span>
                                                ) : item.status === 'Disetujui' ? (
                                                    <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600 border border-emerald-200">Disetujui</span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-100 text-rose-600 border border-rose-200">Ditolak</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                                            <div className="text-[10px]">
                                                <span className="text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Objek Pengguna</span>
                                                <span className="text-slate-600 font-medium">{item.objek_pengguna}</span>
                                            </div>
                                            <div className="text-[10px]">
                                                <span className="text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Hasil / Output</span>
                                                <span className="text-slate-600 font-medium">{item.hasil_kegiatan}</span>
                                            </div>
                                        </div>

                                        {hasConflict && item.status === 'Pending' && (
                                            <div className="mt-3 p-3 bg-rose-100/50 rounded-xl border border-rose-200 flex items-start gap-3 animate-pulse">
                                                <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5" />
                                                <div className="text-[10px] text-rose-800">
                                                    <p className="font-black uppercase tracking-wider">Bentrok Lokasi Terdeteksi!</p>
                                                    <p className="mt-0.5">Ruangan ini sudah dipesan oleh <strong>{conflicts[0].nama_pj}</strong> pada jam yang sama.</p>
                                                </div>
                                            </div>
                                        )}

                                        {canApprove && item.status === 'Pending' && onUpdateStatus && (
                                            <div className="flex gap-2 pt-3">
                                                <button 
                                                    onClick={() => onUpdateStatus(item.id, 'Disetujui')}
                                                    className="flex-1 py-1.5 bg-emerald-600 text-white text-[10px] font-black rounded-lg hover:bg-emerald-700 shadow-sm shadow-emerald-100"
                                                >
                                                    Setujui
                                                </button>
                                                <button 
                                                    onClick={() => onUpdateStatus(item.id, 'Ditolak')}
                                                    className="flex-1 py-1.5 bg-white border border-rose-200 text-rose-600 text-[10px] font-black rounded-lg hover:bg-rose-50"
                                                >
                                                    Tolak
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
                <p className="text-sm font-medium">Tidak ada agenda ditemukan.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default AgendaActivityTable;
