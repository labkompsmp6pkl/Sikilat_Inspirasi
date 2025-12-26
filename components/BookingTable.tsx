
import React, { useState, useMemo, useEffect } from 'react';
import { PeminjamanAntrian, UserRole, Pengguna } from '../types';
import { 
    Calendar, 
    Clock, 
    User as UserIcon, 
    CheckCircle, 
    XCircle, 
    ChevronLeft, 
    ChevronRight, 
    ShieldAlert, 
    Cloud, 
    RefreshCw, 
    PlusCircle,
    MapPin,
    AlertCircle,
    UserCheck
} from 'lucide-react';

interface BookingTableProps {
  bookings: PeminjamanAntrian[];
  users?: Pengguna[]; // Tambahkan data pengguna untuk mapping nama
  currentUserRole?: UserRole;
  onUpdateStatus?: (id: string, status: 'Disetujui' | 'Ditolak') => void;
  onAddBooking?: () => void;
}

const BookingTable: React.FC<BookingTableProps> = ({ bookings, users = [], currentUserRole, onUpdateStatus, onAddBooking }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTime, setCurrentTime] = useState(new Date());
  const itemsPerPage = 5;

  // Update waktu setiap menit untuk cek "Status Penggunaan Saat Ini"
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
        // Peminjaman terbaru di atas (disesuaikan logic agar status Menunggu tetap jadi prioritas)
        if (a.status_peminjaman === 'Menunggu' && b.status_peminjaman !== 'Menunggu') return -1;
        if (a.status_peminjaman !== 'Menunggu' && b.status_peminjaman === 'Menunggu') return 1;
        
        const dateA = a.tanggal_peminjaman ? new Date(a.tanggal_peminjaman).getTime() : 0;
        const dateB = b.tanggal_peminjaman ? new Date(b.tanggal_peminjaman).getTime() : 0;
        return dateB - dateA;
    });
  }, [bookings]);

  const currentData = sortedBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(sortedBookings.length / itemsPerPage);
  const canManage = ['penanggung_jawab', 'admin'].includes(currentUserRole || '');

  // Fungsi pengecekan apakah saat ini ruangan sedang dipakai
  const isCurrentlyInUse = (booking: PeminjamanAntrian) => {
    if (booking.status_peminjaman !== 'Disetujui' || !booking.jam_mulai || !booking.jam_selesai || !booking.tanggal_peminjaman) return false;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const bookingDateStr = new Date(booking.tanggal_peminjaman).toISOString().split('T')[0];
    
    if (todayStr !== bookingDateStr) return false;

    const [hStart, mStart] = booking.jam_mulai.split(':').map(Number);
    const [hEnd, mEnd] = booking.jam_selesai.split(':').map(Number);
    
    const nowH = currentTime.getHours();
    const nowM = currentTime.getMinutes();
    
    const startTimeInMinutes = hStart * 60 + mStart;
    const endTimeInMinutes = hEnd * 60 + mEnd;
    const nowInMinutes = nowH * 60 + nowM;

    return nowInMinutes >= startTimeInMinutes && nowInMinutes <= endTimeInMinutes;
  };

  const getPeminjamName = (id: string) => {
    const user = users.find(u => u.id_pengguna === id);
    return user ? user.nama_lengkap : 'Staf SIKILAT';
  };

  const triggerRefresh = () => {
    window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE'));
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col transition-all">
      <div className="px-6 md:px-8 py-6 border-b bg-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 shadow-sm">
                <Calendar className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
                <h3 className="font-black text-slate-800 text-lg md:text-xl tracking-tight leading-none uppercase italic">Jadwal & Antrian Ruangan</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Sinkronisasi Cloud Aktif</p>
            </div>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
             <button 
                onClick={triggerRefresh}
                className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all border border-slate-100"
                title="Refresh Data"
             >
                <RefreshCw className="w-5 h-5" />
             </button>
             <button 
                onClick={onAddBooking}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95"
             >
                <PlusCircle className="w-4 h-4" /> BOOKING SEKARANG
             </button>
             {canManage && (
                <button className="hidden sm:flex items-center gap-2 px-6 py-3 bg-white text-slate-400 border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">
                    <ShieldAlert className="w-3.5 h-3.5" /> MANAGEMENT
                </button>
             )}
        </div>
      </div>
      
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-[9px] text-slate-400 uppercase font-black tracking-[0.3em] bg-slate-50/50">
            <tr>
              <th className="px-8 py-5">ASET / RUANGAN</th>
              <th className="px-8 py-5">PEMINJAM</th>
              <th className="px-8 py-5">WAKTU PENGGUNAAN</th>
              <th className="px-8 py-5 text-right">STATUS & AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentData.length > 0 ? currentData.map((booking) => {
              const inUse = isCurrentlyInUse(booking);
              return (
                <tr key={booking.id_peminjaman} className={`group transition-all ${inUse ? 'bg-indigo-50/40' : 'hover:bg-slate-50/30'}`}>
                    <td className="px-8 py-7">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${inUse ? 'bg-indigo-600 text-white animate-status-pulse' : 'bg-slate-100 text-slate-500'}`}>
                                {inUse ? <Clock className="w-5 h-5" /> : (booking.nama_barang || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="font-black text-slate-800 text-base leading-none">{booking.nama_barang || 'Aset Tanpa Nama'}</div>
                                <div className="text-[10px] text-slate-400 font-bold mt-1.5 flex items-center gap-1.5 uppercase">
                                    <MapPin className="w-3 h-3" /> {booking.keperluan || 'Tanpa Keperluan'}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td className="px-8 py-7">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-500">
                                <UserIcon className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-700">{getPeminjamName(booking.id_pengguna)}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{booking.id_peminjaman}</span>
                            </div>
                        </div>
                    </td>
                    <td className="px-8 py-7">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-800">
                                    {booking.tanggal_peminjaman ? new Date(booking.tanggal_peminjaman).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                </span>
                                {inUse && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-tighter rounded border border-indigo-200">AKTIF SAAT INI</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 shadow-sm">
                                    {booking.jam_mulai || '??:??'} WIB
                                </span>
                                <span className="text-slate-300">→</span>
                                <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                                    {booking.jam_selesai || '??:??'} WIB
                                </span>
                            </div>
                        </div>
                    </td>
                    <td className="px-8 py-7 text-right">
                        <div className="flex items-center justify-end gap-3">
                            {booking.status_peminjaman === 'Disetujui' ? (
                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-100">
                                    <CheckCircle className="w-4 h-4" /> DISETUJUI
                                </div>
                            ) : booking.status_peminjaman === 'Ditolak' ? (
                                <div className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl">
                                    <XCircle className="w-4 h-4" /> DITOLAK
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    {canManage ? (
                                        <>
                                            <button onClick={() => onUpdateStatus?.(booking.id_peminjaman, 'Disetujui')} className="px-4 py-2.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95">SETUJUI</button>
                                            <button onClick={() => onUpdateStatus?.(booking.id_peminjaman, 'Ditolak')} className="px-4 py-2.5 bg-white border border-rose-200 text-rose-600 text-[10px] font-black rounded-xl hover:bg-rose-50 transition-all">TOLAK</button>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-amber-100">
                                            <Clock className="w-4 h-4" /> MENUNGGU
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
              );
            }) : (
                <tr>
                    <td colSpan={4} className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-300">
                            <Calendar className="w-16 h-16 mb-4 opacity-10" />
                            <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Database Kosong</p>
                            <p className="text-xs font-medium text-slate-400 mt-2">Belum ada jadwal peminjaman ruangan atau alat hari ini.</p>
                            <button onClick={onAddBooking} className="mt-6 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-all">BUAT JADWAL PERDANA</button>
                        </div>
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="px-8 py-5 border-t bg-slate-50/30 flex justify-between items-center">
             <div className="flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Halaman {currentPage} / {totalPages}</p>
             </div>
             <div className="flex gap-3">
                 <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest disabled:opacity-30 transition-all"
                 >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                 </button>
                 <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest disabled:opacity-30 transition-all"
                 >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                 </button>
             </div>
        </div>
      )}
    </div>
  );
};

export default BookingTable;
