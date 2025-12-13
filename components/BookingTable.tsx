
import React, { useState, useMemo } from 'react';
import { PeminjamanAntrian } from '../types';
import { Calendar, Clock, User, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface BookingTableProps {
  bookings: PeminjamanAntrian[];
}

const BookingTable: React.FC<BookingTableProps> = ({ bookings }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter out "Kembali" if you only want active bookings, or keep all.
  // For dashboard monitor, usually active/upcoming is relevant.
  const activeBookings = useMemo(() => {
    return [...bookings].sort((a, b) => new Date(b.tanggal_peminjaman).getTime() - new Date(a.tanggal_peminjaman).getTime());
  }, [bookings]);

  if (activeBookings.length === 0) return null;

  // Pagination Logic
  const totalPages = Math.ceil(activeBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = activeBookings.slice(startIndex, startIndex + itemsPerPage);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'Disetujui': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3"/> Disetujui</span>;
          case 'Ditolak': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700"><XCircle className="w-3 h-3"/> Ditolak</span>;
          case 'Menunggu': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700"><Clock className="w-3 h-3"/> Menunggu</span>;
          default: return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600"><CheckCircle className="w-3 h-3"/> {status}</span>;
      }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b bg-blue-50/50 border-blue-100 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          Peminjaman & Antrian ({activeBookings.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 font-medium">Barang / Ruangan</th>
              <th className="px-4 py-3 font-medium">Peminjam</th>
              <th className="px-4 py-3 font-medium">Jadwal</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentData.map((booking) => (
              <tr key={booking.id_peminjaman} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{booking.nama_barang}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[150px]">{booking.keperluan}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                    <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-400"/>
                        {/* Note: In a real app we'd resolve ID to Name, here using ID or if name available */}
                        {booking.id_pengguna}
                    </div>
                </td>
                <td className="px-4 py-3">
                    <div className="text-xs font-medium text-slate-700">
                        {new Date(booking.tanggal_peminjaman).toLocaleDateString()}
                    </div>
                    {booking.jam_mulai && (
                        <div className="text-xs text-slate-500">
                            {booking.jam_mulai} - {booking.jam_selesai}
                        </div>
                    )}
                </td>
                <td className="px-4 py-3">
                    {getStatusBadge(booking.status_peminjaman)}
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
  );
};

export default BookingTable;
