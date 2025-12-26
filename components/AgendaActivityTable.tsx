
import React, { useState, useMemo } from 'react';
import { AgendaKegiatan, UserRole } from '../types';
import { Calendar, CheckCircle2, MapPin, User, ShieldAlert, X, XCircle, MessageSquare } from 'lucide-react';

interface AgendaActivityTableProps {
  activities: AgendaKegiatan[];
  onUpdateStatus?: (id: string, status: 'Disetujui' | 'Ditolak', reason?: string) => void;
  currentUserRole: UserRole;
}

const AgendaActivityTable: React.FC<AgendaActivityTableProps> = ({ activities, onUpdateStatus, currentUserRole }) => {
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Disetujui' | 'Ditolak'>('All');
  const isSupervisor = ['pengawas_it', 'pengawas_sarpras', 'admin', 'pengawas_admin'].includes(currentUserRole);

  const groupedData = useMemo(() => {
    let filtered = activities;
    if (filterStatus !== 'All') filtered = activities.filter(a => a.status === filterStatus);
    const groups: Record<string, AgendaKegiatan[]> = {};
    filtered.forEach(activity => {
        if (activity.waktu_mulai) {
          const dateKey = new Date(activity.waktu_mulai).toDateString();
          if (!groups[dateKey]) groups[dateKey] = [];
          groups[dateKey].push(activity);
        }
    });
    return Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[0]).getTime();
      const dateB = new Date(b[0]).getTime();
      return dateB - dateA;
    });
  }, [activities, filterStatus]);

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-8 py-6 border-b bg-white flex justify-between items-center">
        <div>
            <h3 className="font-black text-slate-800 flex items-center gap-3 text-lg">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Agenda Operasional Harian
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Monitoring utilisasi ruangan dan pemeliharaan alat.</p>
        </div>
        <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-black text-[10px] uppercase tracking-widest border border-indigo-100">
                <ShieldAlert className="w-3.5 h-3.5" /> REVIEWER MODE
            </button>
            <div className="flex bg-slate-100 p-1 rounded-xl">
                {['All', 'Pending', 'Disetujui', 'Ditolak'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s as any)} className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filterStatus === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{s}</button>
                ))}
            </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {groupedData.map(([date, dateActivities]) => (
            <div key={date} className="space-y-4">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    <span className="text-[9px] font-black text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 uppercase">{dateActivities.length} Agenda</span>
                </div>
                
                {dateActivities.map(item => (
                    <div key={item.id} className="flex gap-6 p-6 bg-white rounded-[1.5rem] border border-slate-100 hover:shadow-md transition-all group relative">
                        <div className="flex flex-col items-center justify-center border-r border-slate-100 pr-6 min-w-[100px]">
                            <span className="text-sm font-black text-slate-800">{item.waktu_mulai ? new Date(item.waktu_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                            <div className="h-4 w-px bg-slate-200 my-1"></div>
                            <span className="text-[10px] font-bold text-slate-400">{item.waktu_selesai ? new Date(item.waktu_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                        </div>

                        <div className="flex-1">
                            <h4 className="text-base font-black text-slate-800">{item.uraian_kegiatan}</h4>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 text-[10px] font-black">
                                    <MapPin className="w-3 h-3" /> {item.posisi}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                    <User className="w-3.5 h-3.5" /> {item.nama_pj}
                                </div>
                            </div>

                            {isSupervisor && item.status === 'Pending' && (
                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => onUpdateStatus?.(item.id, 'Disetujui')} className="flex-1 py-2.5 bg-emerald-600 text-white text-[10px] font-black rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> SETUJUI
                                    </button>
                                    <button onClick={() => onUpdateStatus?.(item.id, 'Ditolak')} className="flex-1 py-2.5 bg-white border-2 border-rose-200 text-rose-600 text-[10px] font-black rounded-xl hover:bg-rose-50 transition-all flex items-center justify-center gap-2">
                                        <XCircle className="w-3.5 h-3.5" /> TOLAK AGENDA
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-end justify-start">
                            <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] ${item.status === 'Disetujui' ? 'bg-emerald-500 text-white' : item.status === 'Ditolak' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'}`}>
                                {item.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        ))}
      </div>
    </div>
  );
};

export default AgendaActivityTable;
