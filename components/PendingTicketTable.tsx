import React, { useState } from 'react';
import { PengaduanKerusakan } from '../types';
import { Clock, Play, AlertCircle, MapPin, User, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface PendingTicketTableProps {
  reports: PengaduanKerusakan[];
  onProcessAction: (prompt: string) => void;
  isReadOnly?: boolean;
}

const PendingTicketTable: React.FC<PendingTicketTableProps> = ({ reports, onProcessAction, isReadOnly = false }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const pendingReports = reports
    .filter(r => r.status === 'Pending')
    .sort((a, b) => new Date(a.tanggal_lapor).getTime() - new Date(b.tanggal_lapor).getTime());

  if (pendingReports.length === 0) {
    return null; // Don't render if no pending tickets
  }

  // Pagination Logic
  const totalPages = Math.ceil(pendingReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = pendingReports.slice(startIndex, startIndex + itemsPerPage);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b bg-amber-50/50 border-amber-100 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          Antrian Tiket Pending ({pendingReports.length})
          {isReadOnly && <span className="text-xs text-slate-400 font-normal ml-2">(Mode Monitor)</span>}
        </h3>
        {!isReadOnly && <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-md">Perlu Tindakan</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 font-medium">ID & Tanggal</th>
              <th className="px-4 py-3 font-medium">Aset & Masalah</th>
              <th className="px-4 py-3 font-medium">Lokasi & Pelapor</th>
              {!isReadOnly && <th className="px-4 py-3 font-medium text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentData.map((report) => (
              <tr key={report.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col items-start">
                     <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 tracking-tight whitespace-nowrap">
                        {report.id}
                     </span>
                     <span className="text-xs text-slate-400 mt-1 ml-0.5">
                        {new Date(report.tanggal_lapor).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
                     </span>
                  </div>
                </td>
                <td className="px-4 py-3 align-top max-w-xs">
                  <div className="font-medium text-slate-800">{report.nama_barang}</div>
                  <div className="text-slate-500 text-xs mt-0.5 line-clamp-2">{report.deskripsi_masalah}</div>
                  <span className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold rounded border ${report.kategori_aset === 'IT' ? 'bg-violet-50 text-violet-600 border-violet-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                    {report.kategori_aset}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-1.5 text-slate-600 text-xs mb-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> {report.lokasi_kerusakan}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <User className="w-3 h-3 text-slate-400" /> {report.nama_pengadu}
                    </div>
                </td>
                {!isReadOnly && (
                    <td className="px-4 py-3 align-middle text-right">
                    <button
                        onClick={() => onProcessAction(`Perbarui status laporan ${report.id} menjadi Proses`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-200 transition-all hover:scale-105 active:scale-95"
                    >
                        <Play className="w-3 h-3 fill-current" />
                        Mulai Perbaikan
                    </button>
                    </td>
                )}
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

export default PendingTicketTable;