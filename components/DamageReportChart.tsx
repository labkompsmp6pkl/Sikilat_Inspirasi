
import React, { useMemo } from 'react';
import { PengaduanKerusakan } from '../types';
import { BarChart2, Monitor, Building2, Wrench, FileText, ArrowRightCircle } from 'lucide-react';

interface DamageReportChartProps {
  reports: PengaduanKerusakan[];
  onProcessAction?: (prompt: string) => void;
}

interface AggregatedDamage {
  type: string;
  count: number;
  category: 'IT' | 'Sarpras' | 'General';
}

const DamageReportChart: React.FC<DamageReportChartProps> = ({ reports, onProcessAction }) => {
  const chartData = useMemo(() => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const recentReports = reports.filter(report => new Date(report.tanggal_lapor) > oneMonthAgo);
    
    const aggregation: Record<string, AggregatedDamage> = {};

    recentReports.forEach(report => {
      let damageType = report.nama_barang;
      if (report.deskripsi_masalah.toLowerCase().includes('tidak berfungsi')) damageType += ' (Tidak Berfungsi)';
      else if (report.deskripsi_masalah.toLowerCase().includes('buram')) damageType += ' (Buram)';
      else if (report.deskripsi_masalah.toLowerCase().includes('tidak dingin')) damageType += ' (Tidak Dingin)';
      else if (report.deskripsi_masalah.toLowerCase().includes('patah')) damageType += ' (Patah/Rusak Fisik)';
      else if (report.deskripsi_masalah.toLowerCase().includes('lambat')) damageType += ' (Lambat)';
      
      if (aggregation[damageType]) {
        aggregation[damageType].count++;
      } else {
        aggregation[damageType] = {
          type: damageType,
          count: 1,
          category: report.kategori_aset
        };
      }
    });

    const sortedData = Object.values(aggregation).sort((a, b) => b.count - a.count);
    
    const itData = sortedData.filter(d => d.category === 'IT');
    const sarprasAndGeneralData = sortedData.filter(d => d.category === 'Sarpras' || d.category === 'General');
    
    const maxCount = Math.max(...sortedData.map(d => d.count), 0);

    return { itData, sarprasAndGeneralData, maxCount };
  }, [reports]);

  const handleSOPAction = (item: AggregatedDamage) => {
    if (onProcessAction) {
        const prompt = `Analisis dan buatkan SOP standar (Standar Operasional Prosedur) perbaikan teknis untuk menangani masalah: ${item.type} (Kategori: ${item.category}). Sertakan alat yang dibutuhkan, langkah keselamatan, dan kriteria keputusan apakah harus diperbaiki sendiri atau diganti.`;
        onProcessAction(prompt);
    }
  };

  const CategorySection = ({ title, data, maxCount, color, Icon }: { title: string, data: AggregatedDamage[], maxCount: number, color: string, Icon: React.FC<any> }) => {
    if (data.length === 0) return null;
    
    const colorClasses = {
        violet: { text: 'text-violet-600', bg: 'bg-violet-500', bgLight: 'bg-violet-100', btnHover: 'hover:bg-violet-50 text-violet-700' },
        amber: { text: 'text-amber-600', bg: 'bg-amber-500', bgLight: 'bg-amber-100', btnHover: 'hover:bg-amber-50 text-amber-700' },
    };
    const theme = colorClasses[color as keyof typeof colorClasses] || colorClasses.amber;

    return (
        <div>
            <h4 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${theme.text}`}>
                <Icon className="w-4 h-4" />
                {title}
            </h4>
            <div className="space-y-4">
                {data.map(item => (
                    <div key={item.type} className="text-xs group">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-slate-600 truncate pr-2">{item.type}</span>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-700">{item.count} Laporan</span>
                            </div>
                        </div>
                        <div className={`w-full h-2 rounded-full ${theme.bgLight} mb-2`}>
                            <div 
                                className={`h-2 rounded-full ${theme.bg}`}
                                style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
                            ></div>
                        </div>
                        {/* Action Button */}
                        <div className="flex justify-end">
                            <button 
                                onClick={() => handleSOPAction(item)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 shadow-sm bg-white transition-colors ${theme.btnHover} opacity-90 group-hover:opacity-100`}
                            >
                                <Wrench className="w-3.5 h-3.5" />
                                <span className="font-semibold">Tindakan SOP</span>
                                <ArrowRightCircle className="w-3.5 h-3.5 opacity-50" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-violet-600" />
          Analisis Kerusakan Aset (30 Hari Terakhir)
        </h3>
      </div>
      <div className="p-4 space-y-6">
        <CategorySection title="Aset IT" data={chartData.itData} maxCount={chartData.maxCount} color="violet" Icon={Monitor} />
        <CategorySection title="Aset Sarpras & Umum" data={chartData.sarprasAndGeneralData} maxCount={chartData.maxCount} color="amber" Icon={Building2} />
        
        {chartData.itData.length === 0 && chartData.sarprasAndGeneralData.length === 0 && (
             <p className="text-center text-sm text-slate-500 py-4">Tidak ada laporan kerusakan dalam 30 hari terakhir.</p>
        )}
      </div>
    </div>
  );
};

export default DamageReportChart;
