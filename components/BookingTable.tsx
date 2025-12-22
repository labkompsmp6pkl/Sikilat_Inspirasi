
import React, { useState, useMemo } from 'react';
import { PeminjamanAntrian, UserRole } from '../types';
import { Calendar, Clock, User, CheckCircle, XCircle, ChevronLeft, ChevronRight, CheckSquare, AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface BookingTableProps {
  bookings: PeminjamanAntrian[];
  currentUserRole?: UserRole;
  onUpdateStatus?: (id: string, status: 'Disetujui' | 'Ditolak', reason?: string) => void;
}

const BookingTable: React.FC<BookingTableProps> = ({ bookings, currentUserRole, onUpdateStatus }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Sorting: Pending di paling atas, lalu berdasarkan tanggal terbaru
  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
        // Prioritas 1: Pending di atas
        if (a.status_peminjaman === 'Menunggu' && b.status_peminjaman !== 'Menunggu') return -1;
        if (a.status_peminjaman !== 'Menunggu' && b.status_peminjaman === 'Menunggu') return 1;
        
        // Prioritas 2: Tanggal Peminjaman (Terbaru di atas)
        return new Date(b.tanggal_peminjaman).getTime() - new Date(a.tanggal_peminjaman).getTime();
    });
  }, [bookings]);

  // Conflict Detection Logic
  const getConflictWarning = (currentBooking: PeminjamanAntrian) => {
      if (currentBooking.status_peminjaman !== 'Menunggu') return null;

      const conflict = bookings.find(b => 
          b.id_peminjaman !== currentBooking.id_peminjaman && // Bukan diri sendiri
          b.nama_barang === currentBooking.nama_barang && // Ruangan sama
          new Date(b.tanggal_peminjaman).toDateString() === new Date(currentBooking.tanggal_peminjaman).toDateString() && // Tanggal sama
          (b.status_peminjaman === 'Disetujui' || b.status_peminjaman === 'Menunggu') && // Status aktif
          // Cek irisan waktu (sederhana)
          (
             (b.jam_mulai && currentBooking.jam_mulai && b.jam_mulai <= currentBooking.jam_mulai && b.jam_selesai && b.jam_selesai > currentBooking.jam_mulai) ||
             (b.jam_mulai && currentBooking.jam_selesai && b.jam_mulai < currentBooking.jam_selesai && b.jam_selesai && b.jam_selesai >= currentBooking.jam_selesai)
          )
      );

      if (conflict) {
          return (
              <div className="mt-1 flex items-start gap-1 text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>
                      <strong>Bentrok dengan:</strong> {conflict.id_pengguna} <br/>
                      ({conflict.jam_mulai}-{conflict.jam_selesai})
                  </span>
              </div>
          );
      }
      return null;
  };

  const activeBookings = sortedBookings; // Show all for history context

  if (activeBookings.length === 0) return null;

  // Pagination
  const totalPages = Math.ceil(activeBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = activeBookings.slice(startIndex, startIndex + itemsPerPage);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  // Admin dikeluarkan dari fungsi manajerial operasional (Persetujuan)
  const canManage = ['penanggung_jawab', 'pengawas_sarpras', 'pengawas_it'].includes(currentUserRole || '');

  const handleOpenRejectModal = (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); 
      e.preventDefault();
      setSelectedBookingId(id);
      setRejectionReason("Jadwal bentrok dengan kegiatan lain"); // Default placeholder value
      setRejectModalOpen(true);
  };
  
  const handleConfirmReject = () => {
      if (selectedBookingId && onUpdateStatus) {
          onUpdateStatus(selectedBookingId, 'Ditolak', rejectionReason || "Tidak ada alasan spesifik");
          setRejectModalOpen(false);
          setSelectedBookingId(null);
          setRejectionReason("");
      }
  };

  const handleApprove = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      if(onUpdateStatus) onUpdateStatus(id, 'Disetujui');
  }

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'Disetujui': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3"/> Disetujui</span>;
          case 'Ditolak': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700"><XCircle className="w-3 h-3"/> Ditolak</span>;
          case 'Menunggu': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700"><Clock className="w-3 h-3"/> Menunggu PJ</span>;
          default: return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600"><CheckCircle className="w-3 h-3"/> {status}</span>;
      }
  }

  return (
    <>
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative z-10">
      <div className="p-4 border-b bg-blue-50/50 border-blue-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Manajemen Peminjaman & Antrian
            </h3>
            <p className="text-xs text-slate-500 mt-1">Daftar pengajuan penggunaan ruangan dan alat.</p>
        </div>
        {canManage && (
             <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Mode Otoritas
             </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 font-medium">Barang / Ruangan</th>
              <th className="px-4 py-3 font-medium">Peminjam & Keperluan</th>
              <th className="px-4 py-3 font-medium">Jadwal</th>
              <th className="px-4 py-3 font-medium text-right">Status & Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentData.map((booking) => (
              <tr key={booking.id_peminjaman} className={`hover:bg-slate-50 transition-colors ${booking.status_peminjaman === 'Menunggu' && canManage ? 'bg-amber-50/30' : ''}`}>
                <td className="px-4 py-3 align-top">
                    <div className="font-medium text-slate-800">{booking.nama_barang}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">{booking.id_peminjaman}</div>
                    {/* Show Conflict Warning for Operational Roles */}
                    {canManage && getConflictWarning(booking)}
                </td>
                <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium mb-1">
                        <User className="w-3 h-3 text-slate-400"/>
                        {booking.id_pengguna}
                    </div>
                    <div className="text-xs text-slate-500 italic">"{booking.keperluan}"</div>
                    {booking.alasan_penolakan && (
                        <div className="mt-1 text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 inline-block">
                            Alasan tolak: {booking.alasan_penolakan}
                        </div>
                    )}
                </td>
                <td className="px-4 py-3 align-top">
                    <div className="text-xs font-medium text-slate-700 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(booking.tanggal_peminjaman).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    {booking.jam_mulai && (
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {booking.jam_mulai} - {booking.jam_selesai}
                        </div>
                    )}
                </td>
                <td className="px-4 py-3 align-top text-right">
                    <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(booking.status_peminjaman)}
                        
                        {/* Approval Actions for Operational Roles Only */}
                        {canManage && booking.status_peminjaman === 'Menunggu' && onUpdateStatus && (
                            <div className="flex gap-1 mt-1">
                                <button 
                                    onClick={(e) => handleApprove(e, booking.id_peminjaman)}
                                    className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded shadow-sm transition-all active:scale-95"
                                    title="Setujui Peminjaman"
                                >
                                    <CheckSquare className="w-3 h-3" /> Terima
                                </button>
                                <button 
                                    onClick={(e) => handleOpenRejectModal(e, booking.id_peminjaman)}
                                    className="flex items-center gap-1 px-2 py-1 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[10px] font-bold rounded shadow-sm transition-all active:scale-95"
                                    title="Tolak Peminjaman"
                                >
                                    <XCircle className="w-3 h-3" /> Tolak
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

    {/* Custom Modal for Rejection */}
    {rejectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity" onClick={() => setRejectModalOpen(false)} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-rose-600" />
                        Tolak Peminjaman
                    </h3>
                    <button onClick={() => setRejectModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="mb-5">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Alasan Penolakan</label>
                    <textarea 
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 min-h-[100px] text-sm resize-none shadow-sm"
                        placeholder="Contoh: Ruangan akan digunakan untuk rapat guru..."
                        autoFocus
                    />
                    <p className="text-xs text-slate-500 mt-2">Alasan ini akan muncul di dashboard peminjam.</p>
                </div>
                
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                    <button 
                        onClick={() => setRejectModalOpen(false)}
                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={handleConfirmReject}
                        className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm shadow-rose-200 transition-colors"
                    >
                        Konfirmasi Tolak
                    </button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default BookingTable;
