import React, { useMemo, useState } from 'react';
import { PengaduanKerusakan } from '../types';
import { BarChart2, Monitor, Building2, Wrench, ArrowRightCircle, Filter, Sparkles, TrendingUp } from 'lucide-react';

interface DamageReportChartProps {
  reports: PengaduanKerusakan[];
  onProcessAction?: (prompt: string) => void;
  isReadOnly?: boolean;
}

interface AggregatedDamage {
  type: string;
  count: number;
  category: 'IT' | 'Sarpras' | 'General';
}

const DamageReportChart: React.FC<DamageReportChartProps> = ({ reports, onProcessAction, isReadOnly = false }) => {
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
    const totalCount = sortedData.reduce((acc, curr) => acc + curr.count, 0);

    return { itData, sarprasAndGeneralData, maxCount, totalCount };
  }, [reports, selectedCategory, selectedLocation]);

  const handleSOPAction = (item: AggregatedDamage) => {
    if (onProcessAction) {
        const prompt = `Analisis dan buatkan SOP standar (Standar Operasional Prosedur) perbaikan teknis untuk menangani masalah: ${item.type} (Kategori: ${item.category}). Sertakan alat yang dibutuhkan, langkah keselamatan, dan kriteria keputusan apakah harus diperbaiki sendiri atau diganti.`;
        onProcessAction(prompt);
    }
  };

  const handleDeepAnalysis = () => {
    if (onProcessAction) {
        const context = {
            filter: { category: selectedCategory, location: selectedLocation },
            stats: { total_laporan: chartData.totalCount },
            top_issues: [
                ...chartData.itData.slice(0, 3), 
                ...chartData.sarprasAndGeneralData.slice(0, 3)
            ].map(i => `${i.type} (${i.count} kasus)`)
        };

        const prompt = `
        Tolong lakukan **Analisis Strategis & Prediksi Tren Perbaikan** berdasarkan grafik kerusakan aset yang sedang saya pantau.
        
        **Data Grafik Saat Ini:**
        :::DATA_JSON:::${JSON.stringify(context)}
        
        **Mohon Berikan Insight Mendalam:**
        1. 🔍 **Akar Masalah:** Apa pola tersembunyi dari kerusakan ini? Apakah ada korelasi antara lokasi '${selectedLocation}' dengan jenis kerusakan tertentu?
        2. 📈 **Prediksi Tren:** Berdasarkan frekuensi saat ini, aset mana yang paling berisiko mengalami kerusakan total dalam 30 hari ke depan?
        3. 🛡️ **Rekomendasi Preventif:** Apa langkah pemeliharaan prioritas yang harus dilakukan minggu ini untuk menurunkan angka laporan?
        `;
        
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
                        {/* Action Button - HIDE IF READ ONLY */}
                        {!isReadOnly && (
                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button 
                                    onClick={() => handleSOPAction(item)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 shadow-sm bg-white transition-colors ${theme.btnHover}`}
                                >
                                    <Wrench className="w-3.5 h-3.5" />
                                    <span className="font-semibold">Tindakan SOP</span>
                                    <ArrowRightCircle className="w-3.5 h-3.5 opacity-50" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-4 border-b flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
             <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-violet-600" />
                Analisis Kerusakan Aset
                {isReadOnly && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-wider rounded-full">Monitor Mode</span>}
             </h3>
             <p className="text-xs text-slate-400 hidden sm:block">Visualisasi frekuensi kerusakan 30 hari terakhir.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            {/* AI Analysis Button */}
            <button 
                onClick={handleDeepAnalysis}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition-all w-full sm:w-auto justify-center"
            >
                <Sparkles className="w-3.5 h-3.5" />
                Analisis AI & Prediksi
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                    <Filter className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-600"
                    >
                        <option value="Semua">Semua Kategori</option>
                        <option value="IT">Aset IT</option>
                        <option value="Sarpras & General">Sarpras & Umum</option>
                    </select>
                </div>
                
                <div className="relative flex-1 sm:flex-none">
                    <Building2 className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select 
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-600 max-w-[140px] truncate"
                    >
                        <option value="Semua">Semua Lokasi</option>
                        {uniqueLocations.map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
      </div>
      
      <div className="p-4 space-y-6">
        <CategorySection title="Aset IT" data={chartData.itData} maxCount={chartData.maxCount} color="violet" Icon={Monitor} />
        <CategorySection title="Aset Sarpras & Umum" data={chartData.sarprasAndGeneralData} maxCount={chartData.maxCount} color="amber" Icon={Building2} />
        
        {chartData.itData.length === 0 && chartData.sarprasAndGeneralData.length === 0 && (
             <div className="text-center py-8 bg-slate-50/50 rounded-lg border-2 border-dashed border-slate-100">
                <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-500">Tidak ada data kerusakan.</p>
                <p className="text-xs text-slate-400">Coba ubah filter lokasi atau kategori.</p>
                <button 
                    onClick={() => { setSelectedCategory('Semua'); setSelectedLocation('Semua'); }}
                    className="mt-3 text-xs font-bold text-violet-600 hover:text-violet-800 bg-violet-50 px-3 py-1 rounded-full transition-colors"
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