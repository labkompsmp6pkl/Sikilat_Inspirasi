
import React, { useState, useMemo } from 'react';
import { PeminjamanAntrian, UserRole } from '../types';
import { Calendar, Clock, User, CheckCircle, XCircle, ChevronLeft, ChevronRight, CheckSquare, AlertTriangle, ShieldAlert, X, Cloud, RefreshCw } from 'lucide-react';

interface BookingTableProps {
  bookings: PeminjamanAntrian[];
  currentUserRole?: UserRole;
  onUpdateStatus?: (id: string, status: 'Disetujui' | 'Ditolak', reason?: string) => void;
}

const BookingTable: React.FC<BookingTableProps> = ({ bookings, currentUserRole, onUpdateStatus }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
        if (a.status_peminjaman === 'Menunggu' && b.status_peminjaman !== 'Menunggu') return -1;
        if (a.status_peminjaman !== 'Menunggu' && b.status_peminjaman === 'Menunggu') return 1;
        return new Date(b.tanggal_peminjaman).getTime() - new Date(a.tanggal_peminjaman).getTime();
    });
  }, [bookings]);

  const currentData = sortedBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const canManage = ['penanggung_jawab', 'admin'].includes(currentUserRole || '');

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
        <div>
            <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
                Peminjaman & Antrian
            </h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Status Sinkronisasi: LIVE CLOUD</p>
        </div>
        {canManage && (
             <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100">
                <ShieldAlert className="w-3.5 h-3.5" /> Management
             </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-[10px] text-slate-400 uppercase font-black tracking-widest bg-slate-50/30 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5">Aset / Ruangan</th>
              <th className="px-8 py-5">Keperluan</th>
              <th className="px-8 py-5">Waktu</th>
              <th className="px-8 py-5 text-right">Status & Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {currentData.map((booking) => (
              <tr key={booking.id_peminjaman} className="group hover:bg-slate-50/50 transition-all">
                <td className="px-8 py-6">
                    <div className="font-black text-slate-800 text-base">{booking.nama_barang}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1 opacity-60">ID: {booking.id_peminjaman}</div>
                </td>
                <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-600 font-bold mb-1.5 text-xs">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">{booking.id_pengguna.charAt(0)}</div>
                        {booking.id_pengguna}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium italic line-clamp-2 max-w-[200px]">"{booking.keperluan}"</div>
                </td>
                <td className="px-8 py-6">
                    <div className="text-xs font-black text-slate-700">{new Date(booking.tanggal_peminjaman).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div className="text-[10px] text-slate-400 font-bold mt-1 bg-slate-100 w-fit px-2 py-0.5 rounded-md">{booking.jam_mulai} - {booking.jam_selesai}</div>
                </td>
                <td className="px-8 py-6 text-right">
                    <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-2">
                             {/* Auto-Sync Badge */}
                             {(booking as any).cloud_synced ? (
                                <div className="flex items-center gap-1 text-[8px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-tighter">
                                    <Cloud className="w-2.5 h-2.5" /> SYNCED
                                </div>
                             ) : (
                                <div className="flex items-center gap-1 text-[8px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 uppercase tracking-tighter animate-pulse">
                                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Pushing...
                                </div>
                             )}

                             {booking.status_peminjaman === 'Disetujui' ? (
                                <span className="px-3 py-1 bg-emerald-500 text-white font-black text-[9px] uppercase tracking-widest rounded-lg">Disetujui</span>
                             ) : booking.status_peminjaman === 'Ditolak' ? (
                                <span className="px-3 py-1 bg-rose-500 text-white font-black text-[9px] uppercase tracking-widest rounded-lg">Ditolak</span>
                             ) : (
                                <span className="px-3 py-1 bg-amber-500 text-white font-black text-[9px] uppercase tracking-widest rounded-lg">Menunggu</span>
                             )}
                        </div>
                        
                        {canManage && booking.status_peminjaman === 'Menunggu' && onUpdateStatus && (
                            <div className="flex gap-2">
                                <button 
                                  onClick={() => onUpdateStatus(booking.id_peminjaman, 'Disetujui')} 
                                  className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                                >
                                  Terima
                                </button>
                                <button 
                                  onClick={() => onUpdateStatus(booking.id_peminjaman, 'Ditolak', 'Jadwal Bentrok')} 
                                  className="px-4 py-2 bg-white border border-rose-200 text-rose-600 text-[10px] font-black rounded-xl hover:bg-rose-50 transition-all active:scale-95"
                                >
                                  Tolak
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
    </div>
  );
};

export default BookingTable;
