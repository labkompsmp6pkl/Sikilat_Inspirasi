
import React, { useMemo, useState } from 'react';
import { PengaduanKerusakan } from '../types';
import { BarChart2, Monitor, Building2, Wrench, ArrowRightCircle, Filter } from 'lucide-react';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedLocation, setSelectedLocation] = useState<string>('Semua');

  // Ekstrak lokasi unik untuk dropdown filter
  const uniqueLocations = useMemo(() => {
    const locs = new Set(reports.map(r => r.lokasi_kerusakan));
    return Array.from(locs).sort();
  }, [reports]);

  const chartData = useMemo(() => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Filter Awal: Waktu
    let filteredReports = reports.filter(report => new Date(report.tanggal_lapor) > oneMonthAgo);
    
    // Filter Lanjutan: Kategori
    if (selectedCategory !== 'Semua') {
        if (selectedCategory === 'Sarpras & General') {
            filteredReports = filteredReports.filter(r => r.kategori_aset === 'Sarpras' || r.kategori_aset === 'General');
        } else {
            filteredReports = filteredReports.filter(r => r.kategori_aset === selectedCategory);
        }
    }

    // Filter Lanjutan: Lokasi
    if (selectedLocation !== 'Semua') {
        filteredReports = filteredReports.filter(r => r.lokasi_kerusakan === selectedLocation);
    }

    const aggregation: Record<string, AggregatedDamage> = {};

    filteredReports.forEach(report => {
      let damageType = report.nama_barang;
      // Normalisasi nama kerusakan agar terkelompok dengan baik
      const lowerDesc = report.deskripsi_masalah.toLowerCase();
      if (lowerDesc.includes('tidak berfungsi')) damageType += ' (Tidak Berfungsi)';
      else if (lowerDesc.includes('buram')) damageType += ' (Buram)';
      else if (lowerDesc.includes('tidak dingin')) damageType += ' (Tidak Dingin)';
      else if (lowerDesc.includes('patah')) damageType += ' (Patah/Rusak Fisik)';
      else if (lowerDesc.includes('lambat')) damageType += ' (Lambat)';
      
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
  }, [reports, selectedCategory, selectedLocation]);

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
      <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-violet-600" />
          Analisis Kerusakan Aset
        </h3>
        
        <div className="flex items-center gap-2">
            <div className="relative">
                <Filter className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-600"
                >
                    <option value="Semua">Semua Kategori</option>
                    <option value="IT">Aset IT</option>
                    <option value="Sarpras & General">Sarpras & Umum</option>
                </select>
            </div>
            
            <div className="relative">
                <Building2 className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-600 max-w-[140px] truncate"
                >
                    <option value="Semua">Semua Lokasi</option>
                    {uniqueLocations.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                    ))}
                </select>
            </div>
        </div>
      </div>
      
      <div className="p-4 space-y-6">
        <CategorySection title="Aset IT" data={chartData.itData} maxCount={chartData.maxCount} color="violet" Icon={Monitor} />
        <CategorySection title="Aset Sarpras & Umum" data={chartData.sarprasAndGeneralData} maxCount={chartData.maxCount} color="amber" Icon={Building2} />
        
        {chartData.itData.length === 0 && chartData.sarprasAndGeneralData.length === 0 && (
             <div className="text-center py-8">
                <p className="text-sm text-slate-500">Tidak ada data kerusakan yang sesuai dengan filter.</p>
                <button 
                    onClick={() => { setSelectedCategory('Semua'); setSelectedLocation('Semua'); }}
                    className="mt-2 text-xs font-semibold text-violet-600 hover:text-violet-800"
                >
                    Reset Filter
                </button>
             </div>
        )}
      </div>
    </div>
  );
};

export default DamageReportChart;
