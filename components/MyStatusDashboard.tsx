
import React from 'react';
import { User, PengaduanKerusakan, PeminjamanAntrian } from '../types';
import { ClipboardList, CalendarCheck, AlertTriangle, Clock, CheckCircle, XCircle, Wrench, Info, UserCheck } from 'lucide-react';

interface MyStatusDashboardProps {
  currentUser: User;
  reports: PengaduanKerusakan[];
  bookings: PeminjamanAntrian[];
}

const MyStatusDashboard: React.FC<MyStatusDashboardProps> = ({ currentUser, reports, bookings }) => {
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
