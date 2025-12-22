
import React, { useState, useMemo } from 'react';
import { PeminjamanAntrian, UserRole } from '../types';
import { Calendar, Clock, User, CheckCircle, XCircle, ChevronLeft, ChevronRight, CheckSquare, AlertTriangle, ShieldAlert, X, Cloud } from 'lucide-react';

interface BookingTableProps {
  bookings: PeminjamanAntrian[];
  currentUserRole?: UserRole;
  onUpdateStatus?: (id: string, status: 'Disetujui' | 'Ditolak', reason?: string) => void;
}

const BookingTable: React.FC<BookingTableProps> = ({ bookings, currentUserRole, onUpdateStatus }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
        if (a.status_peminjaman === 'Menunggu' && b.status_peminjaman !== 'Menunggu') return -1;
        if (a.status_peminjaman !== 'Menunggu' && b.status_peminjaman === 'Menunggu') return 1;
        return new Date(b.tanggal_peminjaman).getTime() - new Date(a.tanggal_peminjaman).getTime();
    });
  }, [bookings]);

  const totalPages = Math.ceil(sortedBookings.length / itemsPerPage);
  const currentData = sortedBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const canManage = ['penanggung_jawab', 'admin'].includes(currentUserRole || '');

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b bg-blue-50/50 flex justify-between items-center">
        <div>
            <h3 className="font-black text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Peminjaman & Antrian
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Status Sinkronisasi: LIVE</p>
        </div>
        {canManage && (
             <span className="text-[10px] bg-blue-600 text-white px-3 py-1 rounded-full font-black flex items-center gap-2 uppercase tracking-widest">
                <ShieldAlert className="w-3.5 h-3.5" /> Management
             </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[10px] text-slate-400 uppercase font-black tracking-widest bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Aset / Ruangan</th>
              <th className="px-6 py-4">Keperluan</th>
              <th className="px-6 py-4">Waktu</th>
              <th className="px-6 py-4 text-right">Aksi & Cloud Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentData.map((booking) => (
              <tr key={booking.id_peminjaman} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                    <div className="font-black text-slate-800">{booking.nama_barang}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{booking.id_peminjaman}</div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600 font-bold mb-1 text-xs">
                        <User className="w-3.5 h-3.5"/> {booking.id_pengguna}
                    </div>
                    <div className="text-[11px] text-slate-400 italic">"{booking.keperluan}"</div>
                </td>
                <td className="px-6 py-4">
                    <div className="text-xs font-black text-slate-700">{new Date(booking.tanggal_peminjaman).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                    <div className="text-[10px] text-slate-400 font-bold">{booking.jam_mulai} - {booking.jam_selesai}</div>
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 mb-1">
                             <div className="flex items-center gap-1 text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                <Cloud className="w-3 h-3" /> SYNCED
                             </div>
                             {booking.status_peminjaman === 'Disetujui' ? (
                                <span className="text-emerald-600 font-black text-[10px] uppercase tracking-widest">Disetujui</span>
                             ) : booking.status_peminjaman === 'Ditolak' ? (
                                <span className="text-rose-600 font-black text-[10px] uppercase tracking-widest">Ditolak</span>
                             ) : (
                                <span className="text-amber-600 font-black text-[10px] uppercase tracking-widest">Menunggu</span>
                             )}
                        </div>
                        
                        {canManage && booking.status_peminjaman === 'Menunggu' && onUpdateStatus && (
                            <div className="flex gap-2">
                                <button onClick={() => onUpdateStatus(booking.id_peminjaman, 'Disetujui')} className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black rounded-lg shadow-lg shadow-emerald-100 hover:scale-105 transition-all">Terima</button>
                                <button onClick={() => onUpdateStatus(booking.id_peminjaman, 'Ditolak', 'Jadwal Bentrok')} className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 text-[10px] font-black rounded-lg hover:bg-rose-50 transition-all">Tolak</button>
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
