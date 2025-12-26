
import React, { useState, useMemo } from 'react';
import { PeminjamanAntrian, UserRole } from '../types';
import { Calendar, Clock, User, CheckCircle, XCircle, ChevronLeft, ChevronRight, CheckSquare, ShieldAlert, X, Cloud, RefreshCw, Copy, Check, PlusCircle } from 'lucide-react';

interface BookingTableProps {
  bookings: PeminjamanAntrian[];
  currentUserRole?: UserRole;
  onUpdateStatus?: (id: string, status: 'Disetujui' | 'Ditolak') => void;
  onAddBooking?: () => void;
}

const BookingTable: React.FC<BookingTableProps> = ({ bookings, currentUserRole, onUpdateStatus, onAddBooking }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
        // Prioritaskan yang statusnya 'Menunggu'
        if (a.status_peminjaman === 'Menunggu' && b.status_peminjaman !== 'Menunggu') return -1;
        if (a.status_peminjaman !== 'Menunggu' && b.status_peminjaman === 'Menunggu') return 1;
        
        // Pengurutan cadangan: jika tanggal null, letakkan di urutan terakhir
        const dateA = a.tanggal_peminjaman ? new Date(a.tanggal_peminjaman).getTime() : 0;
        const dateB = b.tanggal_peminjaman ? new Date(b.tanggal_peminjaman).getTime() : 0;
        
        // Jika kedua tanggal ada, urutkan descending (terbaru di atas)
        if (dateA !== 0 && dateB !== 0) return dateB - dateA;
        
        // Jika salah satu null, biarkan yang ada isinya lebih dulu
        return dateB - dateA;
    });
  }, [bookings]);

  const currentData = sortedBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(sortedBookings.length / itemsPerPage);
  const canManage = ['penanggung_jawab', 'admin'].includes(currentUserRole || '');

  const triggerRefresh = () => {
    // Mengirim event ke App.tsx untuk memicu re-fetch data
    window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE'));
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
      <div className="px-8 py-6 border-b bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <div className="flex flex-col">
                <h3 className="font-black text-slate-800 text-lg tracking-tight">Peminjaman & Antrian</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">STATUS SINKRONISASI: LIVE CLOUD</p>
            </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
             <button 
                onClick={triggerRefresh}
                className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"
                title="Refresh Data"
             >
                <RefreshCw className="w-5 h-5" />
             </button>
             <button 
                onClick={onAddBooking}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-600 transition-all active:scale-95"
             >
                <PlusCircle className="w-4 h-4" /> BOOKING BARU
             </button>
             <button className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-white text-slate-400 border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">
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
            {currentData.length > 0 ? currentData.map((booking) => (
              <tr key={booking.id_peminjaman} className="group hover:bg-slate-50/30 transition-all">
                <td className="px-8 py-8">
                    <div className="font-black text-slate-800 text-base">{booking.nama_barang || 'Aset Tanpa Nama'}</div>
                    <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight">ID: {booking.id_peminjaman}</div>
                </td>
                <td className="px-8 py-8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                          {(booking.nama_barang || 'A').charAt(0)}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium italic">"{booking.keperluan || 'Tanpa Keterangan'}"</p>
                    </div>
                </td>
                <td className="px-8 py-8">
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-700">
                          {booking.tanggal_peminjaman ? new Date(booking.tanggal_peminjaman).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md mt-1 border border-slate-100 w-fit">
                          {booking.jam_mulai || '??:??'} - {booking.jam_selesai || '??:??'}
                        </span>
                    </div>
                </td>
                <td className="px-8 py-8 text-right">
                    <div className="flex items-center justify-end gap-3">
                        <span className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 font-black text-[9px] uppercase tracking-widest rounded-lg border border-emerald-100">
                           <Cloud className="w-3 h-3" /> SYNCED
                        </span>
                        
                        {booking.status_peminjaman === 'Disetujui' ? (
                            <span className="px-4 py-2 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm">DISETUJUI</span>
                        ) : booking.status_peminjaman === 'Ditolak' ? (
                            <span className="px-4 py-2 bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm">DITOLAK</span>
                        ) : booking.status_peminjaman === 'Kembali' ? (
                            <span className="px-4 py-2 bg-slate-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm">KEMBALI</span>
                        ) : (
                            <div className="flex gap-2">
                                {canManage ? (
                                    <>
                                        <button onClick={() => onUpdateStatus?.(booking.id_peminjaman, 'Disetujui')} className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-700 shadow-md transition-all active:scale-95">SETUJUI</button>
                                        <button onClick={() => onUpdateStatus?.(booking.id_peminjaman, 'Ditolak')} className="px-4 py-2 bg-rose-600 text-white text-[10px] font-black rounded-lg hover:bg-rose-700 shadow-md transition-all active:scale-95">TOLAK</button>
                                    </>
                                ) : (
                                    <span className="px-4 py-2 bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm">MENUNGGU</span>
                                )}
                            </div>
                        )}
                    </div>
                </td>
              </tr>
            )) : (
                <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-300">
                            <Calendar className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-sm font-black uppercase tracking-widest">Belum Ada Antrian</p>
                            <button onClick={onAddBooking} className="mt-4 text-xs font-bold text-indigo-600 hover:underline">Klik di sini untuk booking</button>
                        </div>
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="px-8 py-4 border-t bg-slate-50/50 flex justify-between items-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Halaman {currentPage} dari {totalPages}</p>
             <div className="flex gap-2">
                 <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
                 >
                    <ChevronLeft className="w-4 h-4" />
                 </button>
                 <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
                 >
                    <ChevronRight className="w-4 h-4" />
                 </button>
             </div>
        </div>
      )}
    </div>
  );
};

export default BookingTable;
