
import React, { useState, useMemo } from 'react';
import { AgendaKegiatan, UserRole } from '../types';
import { Calendar, CheckCircle2, Clock, MapPin, User, ChevronLeft, ChevronRight, CheckSquare, XCircle, Search } from 'lucide-react';

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
  const itemsPerPage = 5;

  // Sorting: Terbaru dulu
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
        const timeA = new Date(a.waktu_mulai).getTime();
        const timeB = new Date(b.waktu_mulai).getTime();
        return timeB - timeA;
    });
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (filterStatus === 'All') return sortedActivities;
    return sortedActivities.filter(a => a.status === filterStatus);
  }, [sortedActivities, filterStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredActivities.slice(startIndex, startIndex + itemsPerPage);

  // Perubahan Logika: Hanya Pengawas IT, Sarpras, dan PJ yang bisa melakukan persetujuan
  // Admin hanya melihat detail info
  const canApprove = ['penanggung_jawab', 'pengawas_it', 'pengawas_sarpras'].includes(currentUserRole);

  const pendingTodayCount = activities.filter(a => {
      const isToday = new Date(a.waktu_mulai).toDateString() === new Date().toDateString();
      return a.status === 'Pending' && isToday;
  }).length;

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const formatTime = (dateStr: string | Date) => {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (dateStr: string | Date) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (activities.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b bg-indigo-50/50 border-indigo-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Agenda Kegiatan Harian ({activities.length})
            </h3>
            <p className="text-xs text-slate-500 mt-1">Rekap aktivitas operasional dan pemeliharaan.</p>
        </div>
        
        <div className="flex items-center gap-2">
            {canApprove && pendingTodayCount > 0 && (
                <button 
                    onClick={onApproveAllToday}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 animate-pulse"
                >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Setujui Semua Hari Ini ({pendingTodayCount})
                </button>
            )}
            
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                {(['All', 'Pending', 'Disetujui'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => { setFilterStatus(status); setCurrentPage(1); }}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterStatus === status ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {status === 'All' ? 'Semua' : status}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 font-medium">Waktu & Lokasi</th>
              <th className="px-4 py-3 font-medium">Uraian Kegiatan</th>
              <th className="px-4 py-3 font-medium">Objek & Hasil</th>
              <th className="px-4 py-3 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentData.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 align-top min-w-[140px]">
                   <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatTime(item.waktu_mulai)} - {formatTime(item.waktu_selesai)}
                      </div>
                      <div className="text-xs text-slate-500">{formatDate(item.waktu_mulai)}</div>
                      <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit mt-1">
                          <MapPin className="w-3 h-3" />
                          {item.posisi}
                      </div>
                   </div>
                </td>
                <td className="px-4 py-3 align-top max-w-xs">
                    <div className="text-slate-800 font-medium mb-1">{item.uraian_kegiatan}</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <User className="w-3 h-3" />
                        PJ: {item.nama_pj || 'Staff'}
                    </div>
                </td>
                <td className="px-4 py-3 align-top max-w-xs">
                    <div className="text-xs font-semibold text-slate-600 mb-1">Objek: <span className="font-normal text-slate-500">{item.objek_pengguna}</span></div>
                    <div className="text-xs font-semibold text-slate-600">Hasil: <span className="font-normal text-slate-500">{item.hasil_kegiatan}</span></div>
                </td>
                <td className="px-4 py-3 align-top text-right">
                    <div className="flex flex-col items-end gap-2">
                        {item.status === 'Pending' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" /> Pending
                            </span>
                        ) : item.status === 'Disetujui' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Disetujui
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3" /> Ditolak
                            </span>
                        )}

                        {canApprove && item.status === 'Pending' && onUpdateStatus && (
                            <div className="flex gap-1">
                                <button 
                                    onClick={() => onUpdateStatus(item.id, 'Disetujui')}
                                    className="p-1 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200 transition-colors"
                                    title="Setujui"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => onUpdateStatus(item.id, 'Ditolak')}
                                    className="p-1 bg-rose-100 text-rose-600 rounded hover:bg-rose-200 transition-colors"
                                    title="Tolak"
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

       {/* Pagination Controls */}
       {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <button 
                onClick={handlePrev} 
                disabled={currentPage === 1}
                className="p-1 rounded-md hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-xs font-medium text-slate-600">
                Hal {currentPage} dari {totalPages}
            </span>
            <button 
                onClick={handleNext} 
                disabled={currentPage === totalPages}
                className="p-1 rounded-md hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
        </div>
      )}
    </div>
  );
};

export default AgendaActivityTable;
