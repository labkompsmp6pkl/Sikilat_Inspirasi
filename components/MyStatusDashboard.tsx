
import React, { useMemo } from 'react';
import { User, PengaduanKerusakan, PeminjamanAntrian, AgendaKegiatan } from '../types';
import { ClipboardList, CalendarCheck, AlertTriangle, Clock, CheckCircle, XCircle, Wrench, Info, UserCheck, Users, Briefcase, Activity, User as UserIcon } from 'lucide-react';

interface MyStatusDashboardProps {
  currentUser: User;
  reports: PengaduanKerusakan[];
  bookings: PeminjamanAntrian[];
  activities?: AgendaKegiatan[]; // Make optional for backward compatibility
}

const MyStatusDashboard: React.FC<MyStatusDashboardProps> = ({ currentUser, reports, bookings, activities = [] }) => {
  
  // --- ROLE BASED LOGIC ---
  const isManagerRole = currentUser.peran === 'penanggung_jawab' || currentUser.peran === 'admin';

  // --- LOGIC FOR MANAGER (PJ/ADMIN) ---
  const managerStats = useMemo(() => {
      if (!isManagerRole) return null;

      // 1. Calculate Resolved Tickets per Person
      const ticketStats: Record<string, number> = {};
      const resolvedReports = reports.filter(r => r.status === 'Selesai');
      
      resolvedReports.forEach(r => {
          const handler = r.diselesaikan_oleh ? r.diselesaikan_oleh.split('(')[0].trim() : 'Tidak Diketahui';
          ticketStats[handler] = (ticketStats[handler] || 0) + 1;
      });

      // 2. Calculate Activities per Person
      const activityStats: Record<string, number> = {};
      activities.forEach(a => {
           const pjName = a.nama_pj || 'Tidak Diketahui';
           activityStats[pjName] = (activityStats[pjName] || 0) + 1;
      });

      // 3. Merge into a Team List
      const allNames = Array.from(new Set([...Object.keys(ticketStats), ...Object.keys(activityStats)]));
      const teamPerformance = allNames.map(name => ({
          name,
          ticketsResolved: ticketStats[name] || 0,
          activitiesCount: activityStats[name] || 0,
          totalContrib: (ticketStats[name] || 0) + (activityStats[name] || 0)
      })).sort((a, b) => b.totalContrib - a.totalContrib);

      // 4. Recent Completions Feed (Combined)
      const recentTickets = resolvedReports.map(r => ({
          id: r.id,
          type: 'ticket',
          title: `Memperbaiki ${r.nama_barang}`,
          handler: r.diselesaikan_oleh || 'Tim Teknis',
          date: new Date(r.tanggal_lapor), // Using report date as proxy if resolution date not avail
          detail: r.catatan_penyelesaian || 'Selesai'
      }));

      const recentActivities = activities.slice(0, 10).map(a => ({
          id: a.id,
          type: 'activity',
          title: a.uraian_kegiatan,
          handler: a.nama_pj || 'Staff',
          date: new Date(a.waktu_mulai),
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


  // --- LOGIC FOR STANDARD USER (GURU/SISWA) ---
  const myReports = reports
    .filter(r => r.id_pengadu === currentUser.id_pengguna)
    .sort((a, b) => b.tanggal_lapor.getTime() - a.tanggal_lapor.getTime())
    .slice(0, 3);

  const myBookings = bookings
    .filter(b => b.id_pengguna === currentUser.id_pengguna)
    .sort((a, b) => b.tanggal_peminjaman.getTime() - a.tanggal_peminjaman.getTime())
    .slice(0, 3);
    
  const statusMap: Record<string, { text: string; color: string; Icon: React.FC<any> }> = {
    'Pending': { text: 'Menunggu', color: 'bg-amber-500', Icon: Clock },
    'Proses': { text: 'Diproses', color: 'bg-blue-500', Icon: Wrench },
    'Selesai': { text: 'Selesai', color: 'bg-emerald-500', Icon: CheckCircle },
    'Menunggu': { text: 'Menunggu Persetujuan', color: 'bg-amber-500', Icon: Clock },
    'Disetujui': { text: 'Disetujui', color: 'bg-emerald-500', Icon: CheckCircle },
    'Ditolak': { text: 'Ditolak', color: 'bg-rose-500', Icon: XCircle },
    'Kembali': { text: 'Selesai', color: 'bg-slate-500', Icon: CheckCircle },
  };

  // --- RENDER FOR MANAGER (PJ) ---
  if (isManagerRole && managerStats) {
      return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                    Monitoring Kinerja Tim & Penyelesaian
                </h3>
                <div className="flex gap-4 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Total Selesai: {managerStats.totalResolved}
                    </span>
                    <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full border border-amber-100">
                        <Clock className="w-3.5 h-3.5" />
                        Pending: {managerStats.totalPending}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Kolom 1: Tabel Kinerja Tim */}
                <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-slate-600">
                        <Users className="w-4 h-4 text-indigo-500" />
                        Distribusi Tugas Tim
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                                <tr>
                                    <th className="px-4 py-3">Nama Petugas</th>
                                    <th className="px-4 py-3 text-center">Tiket Selesai</th>
                                    <th className="px-4 py-3 text-center">Agenda</th>
                                    <th className="px-4 py-3 text-right">Kontribusi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {managerStats.teamPerformance.map((member, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-700 flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${idx === 0 ? 'bg-amber-400' : 'bg-slate-400'}`}>
                                                {member.name.charAt(0)}
                                            </div>
                                            {member.name}
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600 font-mono">{member.ticketsResolved}</td>
                                        <td className="px-4 py-3 text-center text-slate-600 font-mono">{member.activitiesCount}</td>
                                        <td className="px-4 py-3 text-right font-bold text-indigo-600">{member.totalContrib}</td>
                                    </tr>
                                ))}
                                {managerStats.teamPerformance.length === 0 && (
                                    <tr><td colSpan={4} className="p-4 text-center text-slate-400 italic">Belum ada data kinerja.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Kolom 2: Feed Aktivitas Terakhir */}
                <div>
                     <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-slate-600">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        Riwayat Penyelesaian Terakhir
                    </h4>
                    <div className="space-y-3">
                        {managerStats.recentFeed.map((item, idx) => (
                            <div key={idx} className="flex gap-3 p-3 bg-slate-50/80 rounded-lg border border-slate-100">
                                <div className={`flex-shrink-0 mt-0.5 p-1.5 rounded-full ${item.type === 'ticket' ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'}`}>
                                    {item.type === 'ticket' ? <Wrench className="w-3.5 h-3.5" /> : <ClipboardList className="w-3.5 h-3.5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="text-xs font-bold text-slate-700 truncate pr-2">{item.title}</p>
                                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{item.date.toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">"{item.detail}"</p>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 flex items-center gap-1">
                                            <UserIcon className="w-2.5 h-2.5" />
                                            {item.handler}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                         {managerStats.recentFeed.length === 0 && (
                            <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-400 italic">
                                Belum ada aktivitas penyelesaian.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // --- RENDER FOR STANDARD USER ---
  const Section = ({ title, data, type }: { title: string; data: any[]; type: 'report' | 'booking' }) => (
    <div>
      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-slate-600">
        {type === 'report' ? <AlertTriangle className="w-4 h-4 text-rose-500" /> : <CalendarCheck className="w-4 h-4 text-blue-500" />}
        {title}
      </h4>
      {data.length > 0 ? (
        <ul className="space-y-3">
          {data.map(item => {
            const statusInfo = statusMap[item.status || item.status_peminjaman] || { text: item.status || item.status_peminjaman, color: 'bg-slate-500', Icon: AlertTriangle };
            const Icon = statusInfo.Icon;
            return (
              <li key={item.id || item.id_peminjaman} className="flex items-start gap-4 p-3 bg-slate-50/70 hover:bg-slate-100 transition-colors rounded-xl border border-transparent hover:border-slate-200">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white ${statusInfo.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{item.nama_barang}</p>
                      <p className="text-xs text-slate-500">
                        Diajukan: {new Date(item.tanggal_lapor || item.tanggal_peminjaman).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusInfo.color.replace('bg-','bg-').replace('-500','-100')} ${statusInfo.color.replace('bg-','text-').replace('-500','-700')}`}>{statusInfo.text}</span>
                  </div>
                  
                  <div className="mt-2 text-xs text-slate-600 border-l-2 border-slate-200 pl-2 space-y-1">
                    {type === 'booking' && item.jam_mulai && (
                      <>
                        <p><span className="font-semibold text-slate-500">Waktu:</span> {item.jam_mulai} - {item.jam_selesai}</p>
                        <p><span className="font-semibold text-slate-500">Keperluan:</span> {item.keperluan}</p>
                      </>
                    )}
                    {type === 'report' && (
                      <p><span className="font-semibold text-slate-500">Masalah:</span> {item.deskripsi_masalah}</p>
                    )}
                  </div>

                  {/* INFO PENYELESAIAN OLEH PENANGGUNG JAWAB */}
                  {type === 'report' && item.status === 'Selesai' && item.diselesaikan_oleh && (
                     <div className="mt-2 text-xs bg-emerald-50 text-emerald-800 p-2 rounded border border-emerald-100 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
                           <UserCheck className="w-3.5 h-3.5" />
                           Diselesaikan oleh: {item.diselesaikan_oleh}
                        </div>
                        {item.catatan_penyelesaian && (
                           <div className="pl-5 text-emerald-600 opacity-90">
                              "{item.catatan_penyelesaian}"
                           </div>
                        )}
                     </div>
                  )}

                  {/* INFO PENOLAKAN BOOKING */}
                  {item.status_peminjaman === 'Ditolak' && item.alasan_penolakan && (
                    <div className="mt-2 text-xs text-rose-700 bg-rose-50 p-2 rounded-md flex items-start gap-2 border border-rose-100">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-semibold">Alasan Penolakan:</span> {item.alasan_penolakan}
                        </div>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-center text-sm text-slate-500 py-4 bg-slate-50 rounded-lg">Tidak ada data terbaru.</p>
      )}
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Status Laporan & Pemesanan Saya
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Section title="Laporan Kerusakan Terbaru" data={myReports} type="report" />
            <Section title="Peminjaman & Booking Terbaru" data={myBookings} type="booking" />
        </div>
    </div>
  );
};

export default MyStatusDashboard;
