
import React, { useMemo } from 'react';
import { User, PengaduanKerusakan, PeminjamanAntrian, AgendaKegiatan } from '../types';
import { ClipboardList, CalendarCheck, AlertTriangle, Clock, CheckCircle, XCircle, Wrench, Info, UserCheck, Users, Briefcase, Activity, User as UserIcon } from 'lucide-react';

interface MyStatusDashboardProps {
  currentUser: User;
  reports: PengaduanKerusakan[];
  bookings: PeminjamanAntrian[];
  activities?: AgendaKegiatan[];
}

const MyStatusDashboard: React.FC<MyStatusDashboardProps> = ({ currentUser, reports, bookings, activities = [] }) => {
  
  const isManagerRole = currentUser.peran === 'penanggung_jawab' || currentUser.peran === 'admin' || currentUser.peran === 'pengawas_admin';

  const managerStats = useMemo(() => {
      if (!isManagerRole) return null;

      const ticketStats: Record<string, number> = {};
      const resolvedReports = reports.filter(r => r.status === 'Selesai');
      
      resolvedReports.forEach(r => {
          const handler = r.diselesaikan_oleh ? r.diselesaikan_oleh.split('(')[0].trim() : 'Tidak Diketahui';
          ticketStats[handler] = (ticketStats[handler] || 0) + 1;
      });

      const activityStats: Record<string, number> = {};
      activities.forEach(a => {
           const pjName = a.nama_pj || 'Tidak Diketahui';
           activityStats[pjName] = (activityStats[pjName] || 0) + 1;
      });

      const allNames = Array.from(new Set([...Object.keys(ticketStats), ...Object.keys(activityStats)]));
      const teamPerformance = allNames.map(name => ({
          name,
          ticketsResolved: ticketStats[name] || 0,
          activitiesCount: activityStats[name] || 0,
          totalContrib: (ticketStats[name] || 0) + (activityStats[name] || 0)
      })).sort((a, b) => b.totalContrib - a.totalContrib);

      const recentTickets = resolvedReports.map(r => ({
          id: r.id,
          type: 'ticket',
          title: `Memperbaiki ${r.nama_barang}`,
          handler: r.diselesaikan_oleh || 'Tim Teknis',
          date: r.tanggal_lapor ? new Date(r.tanggal_lapor) : new Date(0),
          detail: r.catatan_penyelesaian || 'Selesai'
      }));

      const recentActivities = activities.slice(0, 10).map(a => ({
          id: a.id,
          type: 'activity',
          title: a.uraian_kegiatan,
          handler: a.nama_pj || 'Staff',
          date: a.waktu_mulai ? new Date(a.waktu_mulai) : new Date(0),
          detail: a.hasil_kegiatan
      }));

      const recentFeed = [...recentTickets, ...recentActivities]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5);

      return {
          totalResolved: resolvedReports.length,
          totalPending: reports.filter(r => r.status === 'Pending').length,
          teamPerformance,
          recentFeed
      };
  }, [reports, activities, isManagerRole]);

  const myReports = reports
    .filter(r => r.id_pengadu === currentUser.id_pengguna)
    .sort((a, b) => {
      const dateA = a.tanggal_lapor ? new Date(a.tanggal_lapor).getTime() : 0;
      const dateB = b.tanggal_lapor ? new Date(b.tanggal_lapor).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 3);

  const myBookings = bookings
    .filter(b => b.id_pengguna === currentUser.id_pengguna)
    .sort((a, b) => {
      const dateA = a.tanggal_peminjaman ? new Date(a.tanggal_peminjaman).getTime() : 0;
      const dateB = b.tanggal_peminjaman ? new Date(b.tanggal_peminjaman).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 3);
    
  const statusMap: Record<string, { text: string; color: string; Icon: React.FC<any> }> = {
    'Pending': { text: 'Menunggu', color: 'bg-amber-500', Icon: Clock },
    'Proses': { text: 'Diproses', color: 'bg-blue-500', Icon: Wrench },
    'Selesai': { text: 'Selesai', color: 'bg-emerald-500', Icon: CheckCircle },
    'Menunggu': { text: 'Menunggu', color: 'bg-amber-500', Icon: Clock },
    'Disetujui': { text: 'Disetujui', color: 'bg-emerald-500', Icon: CheckCircle },
    'Ditolak': { text: 'Ditolak', color: 'bg-rose-500', Icon: XCircle },
    'Kembali': { text: 'Selesai', color: 'bg-slate-500', Icon: CheckCircle },
  };

  if (isManagerRole && managerStats) {
      return (
        <div className="bg-white p-5 sm:p-7 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-50 pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Monitoring Kinerja</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Aktivitas Tim Terpusat</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-100 shadow-sm">
                        <CheckCircle className="w-4 h-4" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black leading-none opacity-60">Selesai</span>
                            <span className="text-sm font-black leading-none mt-1">{managerStats.totalResolved}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-2xl border border-amber-100 shadow-sm">
                        <Clock className="w-4 h-4" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black leading-none opacity-60">Pending</span>
                            <span className="text-sm font-black leading-none mt-1">{managerStats.totalPending}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Distributions Table */}
                <div className="lg:col-span-7 space-y-4">
                    <h4 className="font-black text-sm text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Distribusi Tugas Tim
                    </h4>
                    <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
                        <table className="w-full text-xs text-left min-w-[400px]">
                            <thead className="bg-slate-50 text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-5 py-4">Petugas</th>
                                    <th className="px-5 py-4 text-center">Tiket</th>
                                    <th className="px-5 py-4 text-center">Agenda</th>
                                    <th className="px-5 py-4 text-right">Kontribusi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {managerStats.teamPerformance.map((member, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-5 py-4 font-bold text-slate-700 flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs text-white font-black shadow-sm ${idx === 0 ? 'bg-amber-400 shadow-amber-100' : 'bg-slate-400'}`}>
                                                {member.name.charAt(0)}
                                            </div>
                                            {member.name}
                                        </td>
                                        <td className="px-5 py-4 text-center text-slate-600 font-bold">{member.ticketsResolved}</td>
                                        <td className="px-5 py-4 text-center text-slate-600 font-bold">{member.activitiesCount}</td>
                                        <td className="px-5 py-4 text-right">
                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-black">{member.totalContrib}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Feed */}
                <div className="lg:col-span-5 space-y-4">
                     <h4 className="font-black text-sm text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Penyelesaian Terbaru
                    </h4>
                    <div className="space-y-4">
                        {managerStats.recentFeed.map((item, idx) => (
                            <div key={idx} className="flex gap-4 p-4 bg-white rounded-3xl border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all group">
                                <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${item.type === 'ticket' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {item.type === 'ticket' ? <Wrench className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-sm font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{item.title}</p>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium italic line-clamp-1 mb-2">"{item.detail}"</p>
                                    <div className="flex items-center justify-between mt-auto">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <UserIcon className="w-3 h-3" />
                                            {item.handler}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-300">{item.date.toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      );
  }

  const Section = ({ title, data, type }: { title: string; data: any[]; type: 'report' | 'booking' }) => (
    <div className="space-y-4">
      <h4 className="font-black text-sm text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
        {type === 'report' ? <AlertTriangle className="w-4 h-4 text-rose-500" /> : <CalendarCheck className="w-4 h-4 text-blue-500" />}
        {title}
      </h4>
      {data.length > 0 ? (
        <ul className="space-y-4">
          {data.map(item => {
            const statusInfo = statusMap[item.status || item.status_peminjaman] || { text: item.status || item.status_peminjaman, color: 'bg-slate-500', Icon: AlertTriangle };
            const Icon = statusInfo.Icon;
            const dateObj = item.tanggal_lapor || item.tanggal_peminjaman ? new Date(item.tanggal_lapor || item.tanggal_peminjaman) : null;
            return (
              <li key={item.id || item.id_peminjaman} className="flex items-center gap-4 p-4 bg-white rounded-3xl border border-slate-100 hover:shadow-md transition-all group">
                <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${statusInfo.color} shadow-${statusInfo.color.split('-')[1]}-100`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 text-sm truncate">{item.nama_barang}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {dateObj ? dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border ${statusInfo.color.replace('bg-','text-').replace('-500','-600')} ${statusInfo.color.replace('bg-','bg-').replace('-500','-50')} ${statusInfo.color.replace('bg-','border-').replace('-500','-100')}`}>
                        {statusInfo.text}
                    </span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="p-10 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
            <ClipboardList className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-[11px] font-black uppercase tracking-widest">Kosong</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <ClipboardList className="w-6 h-6" />
            </div>
            <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Status Saya</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Log Histori Pribadi</p>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <Section title="Tiket Laporan" data={myReports} type="report" />
            <Section title="Booking Aset" data={myBookings} type="booking" />
        </div>
    </div>
  );
};

export default MyStatusDashboard;
