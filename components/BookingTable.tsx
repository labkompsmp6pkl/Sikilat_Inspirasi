
import React, { useState, useMemo } from 'react';
import { PeminjamanAntrian, UserRole } from '../types';
import { Calendar, Clock, User, CheckCircle, XCircle, ChevronLeft, ChevronRight, CheckSquare, ShieldAlert, X, Cloud, RefreshCw, Copy, Check } from 'lucide-react';

interface BookingTableProps {
  bookings: PeminjamanAntrian[];
  currentUserRole?: UserRole;
  onUpdateStatus?: (id: string, status: 'Disetujui' | 'Ditolak') => void;
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
  const totalPages = Math.ceil(sortedBookings.length / itemsPerPage);
  const canManage = ['penanggung_jawab', 'admin'].includes(currentUserRole || '');

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
      <div className="px-8 py-6 border-b bg-white flex justify-between items-center">
        <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <div className="flex flex-col">
                <h3 className="font-black text-slate-800 text-lg tracking-tight">Peminjaman & Antrian</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">STATUS SINKRONISASI: LIVE CLOUD</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all">
                <ShieldAlert className="w-3.5 h-3.5" /> MANAGEMENT
             </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[9px] text-slate-400 uppercase font-black tracking-[0.2em] bg-slate-50/50">
            <tr>
              <th className="px-8 py-5">ASET / RUANGAN</th>
              <th className="px-8 py-5">KEPERLUAN</th>
              <th className="px-8 py-5">WAKTU</th>
              <th className="px-8 py-5 text-right">STATUS & AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {currentData.map((booking) => (
              <tr key={booking.id_peminjaman} className="group hover:bg-slate-50/30 transition-all">
                <td className="px-8 py-8">
                    <div className="font-black text-slate-800 text-base">{booking.nama_barang}</div>
                    <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight">ID: {booking.id_peminjaman}</div>
                </td>
                <td className="px-8 py-8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">u1</div>
                        <p className="text-[11px] text-slate-500 font-medium italic">"{booking.keperluan}"</p>
                    </div>
                </td>
                <td className="px-8 py-8">
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-700">{new Date(booking.tanggal_peminjaman).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md mt-1 border border-slate-100 w-fit">{booking.jam_mulai} - {booking.jam_selesai}</span>
                    </div>
                </td>
                <td className="px-8 py-8 text-right">
                    <div className="flex items-center justify-end gap-3">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 font-black text-[9px] uppercase tracking-widest rounded-lg border border-emerald-100">
                           <Cloud className="w-3 h-3" /> SYNCED
                        </span>
                        
                        {booking.status_peminjaman === 'Disetujui' ? (
                            <span className="px-4 py-2 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg">DISETUJUI</span>
                        ) : booking.status_peminjaman === 'Ditolak' ? (
                            <span className="px-4 py-2 bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg">DITOLAK</span>
                        ) : (
                            <div className="flex gap-2">
                                {canManage ? (
                                    <>
                                        <button onClick={() => onUpdateStatus?.(booking.id_peminjaman, 'Disetujui')} className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-700">SETUJUI</button>
                                        <button onClick={() => onUpdateStatus?.(booking.id_peminjaman, 'Ditolak')} className="px-4 py-2 bg-rose-600 text-white text-[10px] font-black rounded-lg hover:bg-rose-700">TOLAK</button>
                                    </>
                                ) : (
                                    <span className="px-4 py-2 bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg">PENDING</span>
                                )}
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
