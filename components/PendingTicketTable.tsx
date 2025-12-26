
import React, { useMemo } from 'react';
import { PengaduanKerusakan } from '../types';
import { Clock, Play, MapPin, User, Cloud } from 'lucide-react';

interface PendingTicketTableProps {
  reports: PengaduanKerusakan[];
  onProcessAction: (prompt: string) => void;
  isReadOnly?: boolean;
}

const PendingTicketTable: React.FC<PendingTicketTableProps> = ({ reports, onProcessAction, isReadOnly = false }) => {
  const pendingReports = useMemo(() => {
    return reports.filter(r => r.status === 'Pending')
      .sort((a, b) => new Date(a.tanggal_lapor).getTime() - new Date(b.tanggal_lapor).getTime());
  }, [reports]);

  if (pendingReports.length === 0) return null;

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-8 py-6 border-b bg-amber-50/30 border-amber-100 flex justify-between items-center">
        <h3 className="font-black text-slate-800 flex items-center gap-3 text-lg">
            <Clock className="w-5 h-5 text-amber-600" />
            Antrian Tiket Pending ({pendingReports.length})
        </h3>
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 font-black text-[10px] uppercase tracking-widest">
                <Cloud className="w-3.5 h-3.5" /> LIVE SYNC
            </div>
            <span className="px-4 py-2 bg-amber-100 text-amber-800 font-black text-[10px] uppercase tracking-widest rounded-lg border border-amber-200">Perlu Tindakan</span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[9px] text-slate-400 uppercase font-black tracking-[0.2em] bg-slate-50/50">
            <tr>
              <th className="px-8 py-5">ID & TANGGAL</th>
              <th className="px-8 py-5">ASET & MASALAH</th>
              <th className="px-8 py-5">LOKASI & PELAPOR</th>
              {!isReadOnly && <th className="px-8 py-5 text-right">AKSI</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pendingReports.map((report) => (
              <tr key={report.id} className="hover:bg-slate-50/30 transition-all">
                <td className="px-8 py-8">
                  <div className="flex flex-col">
                     <span className="font-black text-[11px] text-slate-800 bg-slate-100 px-3 py-1 rounded border border-slate-200 w-fit tracking-tight uppercase">
                        {report.id}
                     </span>
                     <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">
                        {new Date(report.tanggal_lapor).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
                     </span>
                  </div>
                </td>
                <td className="px-8 py-8">
                  <div className="font-black text-slate-800 text-base">{report.nama_barang}</div>
                  <div className="text-slate-500 text-[11px] mt-1 font-medium">{report.deskripsi_masalah}</div>
                  <span className="inline-block mt-3 px-2.5 py-1 bg-indigo-50 text-indigo-600 font-black text-[9px] uppercase tracking-widest rounded border border-indigo-100">
                    {report.kategori_aset}
                  </span>
                </td>
                <td className="px-8 py-8">
                    <div className="flex items-center gap-2 text-slate-600 text-xs font-bold mb-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {report.lokasi_kerusakan}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                        <User className="w-3.5 h-3.5 text-slate-400" /> {report.nama_pengadu}
                    </div>
                </td>
                {!isReadOnly && (
                    <td className="px-8 py-8 text-right">
                    <button onClick={() => onProcessAction(`Mulai perbaikan laporan ${report.id}`)} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95">
                        <Play className="w-4 h-4 fill-current" />
                        Mulai Perbaikan
                    </button>
                    </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PendingTicketTable;
