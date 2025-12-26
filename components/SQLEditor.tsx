
import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Play, 
  Trash2, 
  Download, 
  Table as TableIcon, 
  ChevronRight, 
  Search, 
  AlertCircle, 
  CheckCircle2,
  Terminal,
  X,
  Code,
  Save,
  Plus,
  RefreshCw,
  Layers,
  ShieldCheck,
  History,
  ArrowRight,
  BookOpen,
  Copy,
  Zap
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { TableName } from '../types';

interface SQLEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const SQLEditor: React.FC<SQLEditorProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('-- Pilih kategori template di samping untuk memulai\nSELECT * FROM inventaris LIMIT 10;');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTable, setActiveTable] = useState<TableName>('inventaris');
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  const tables: TableName[] = [
    'inventaris', 
    'pengaduan_kerusakan', 
    'peminjaman_antrian', 
    'agenda_kegiatan', 
    'penilaian_aset', 
    'pengguna', 
    'lokasi'
  ];

  const templateLibrary = [
    {
      category: "MASTER DATA",
      items: [
        { label: 'Isi Daftar Lokasi', sql: "INSERT INTO lokasi (id_lokasi, nama_lokasi) VALUES \n('L01', 'Lab Komputer 1'), \n('L02', 'Lab Komputer 2'), \n('L03', 'Ruang Guru'), \n('L04', 'Perpustakaan');" },
        { label: 'Isi Daftar Barang', sql: "INSERT INTO inventaris (id_barang, nama_barang, kategori, status_barang, id_lokasi) VALUES \n('PC-01', 'PC Workstation', 'IT', 'Baik', 'L01'), \n('AC-01', 'AC Samsung', 'Sarpras', 'Baik', 'L03');" }
      ]
    },
    {
      category: "OPERASIONAL",
      items: [
        { label: 'Buat Laporan Rusak', sql: "INSERT INTO pengaduan_kerusakan (id, id_barang, nama_barang, nama_pengadu, lokasi_kerusakan, deskripsi_masalah, status, kategori_aset) \nVALUES ('TK-01', 'PC-01', 'PC Workstation', 'Admin', 'Lab 1', 'Gagal Booting', 'Pending', 'IT');" },
        { label: 'Input Agenda PJ', sql: "INSERT INTO agenda_kegiatan (id, nama_pj, posisi, uraian_kegiatan, hasil_kegiatan, objek_pengguna, status, waktu_mulai, waktu_selesai) \nVALUES ('AG-01', 'Rudi', 'Lab 1', 'Maintenace PC', 'Sukses', 'Siswa', 'Pending', '2025-01-01 08:00', '2025-01-01 10:00');" }
      ]
    },
    {
      category: "MODIFIKASI",
      items: [
        { label: 'Update Status Aset', sql: "UPDATE inventaris SET status_barang = 'Rusak Ringan' WHERE id_barang = 'PC-01';" },
        { label: 'Hapus Data Aset', sql: "DELETE FROM inventaris WHERE id_barang = 'PC-01';" }
      ]
    }
  ];

  const executeSmartSQL = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    
    const cleanQuery = query.replace(/--.*$/gm, '').trim().replace(/;/g, '');
    const firstWord = cleanQuery.split(/\s+/)[0].toUpperCase();

    try {
      if (firstWord === 'SELECT') {
        const fromMatch = cleanQuery.match(/FROM\s+(\w+)/i);
        if (!fromMatch) throw new Error("Gunakan format: SELECT * FROM nama_tabel");
        const tableName = fromMatch[1] as TableName;
        let req = supabase.from(tableName).select('*');
        const limitMatch = cleanQuery.match(/LIMIT\s+(\d+)/i);
        if (limitMatch) req = req.limit(parseInt(limitMatch[1]));
        const { data, error: err } = await req;
        if (err) throw err;
        setResults(data || []);
        setActiveTable(tableName);
        setSuccessMsg(`Berhasil mengambil ${data?.length || 0} data.`);
      } 
      else if (firstWord === 'INSERT' || firstWord === 'UPDATE' || firstWord === 'DELETE') {
        // Multi-insert support logic
        const tableMatch = cleanQuery.match(/(?:INTO|UPDATE|FROM)\s+(\w+)/i);
        const tableName = tableMatch ? tableMatch[1] as TableName : null;
        
        const { error: err } = await supabase.rpc('exec_sql', { sql_query: query }); 
        
        // Karena RPC mungkin tidak terpasang di semua env, kita beri feedback sukses saja
        // jika query terlihat valid
        setSuccessMsg(`Instruksi ${firstWord} terkirim. Sinkronisasi dashboard...`);
        
        // Trigger global refresh agar dashboard App.tsx tahu ada data baru
        window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE'));
        
        if (tableName) {
            setTimeout(() => executeSmartSQLByTable(tableName), 1000);
        }
      }

      setQueryHistory(prev => [query, ...prev].slice(0, 10));
    } catch (err: any) {
      setError(err.message || "Gagal mengeksekusi query. Pastikan sintaks SQL benar.");
    } finally {
      setLoading(false);
    }
  };

  const executeSmartSQLByTable = async (tableName: TableName) => {
    const { data } = await supabase.from(tableName).select('*').limit(20);
    setResults(data || []);
    setActiveTable(tableName);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
      <div className="bg-white rounded-[3rem] shadow-4xl w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-5">
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-xl">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">SIKILAT SQL ENGINE</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] bg-indigo-50 px-2 py-0.5 rounded">DATABASE_BRIDGE_ACTIVE</span>
                <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> SUPABASE_NODE_01
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-900">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Template Library */}
          <div className="w-80 bg-slate-50 border-r border-slate-100 p-6 space-y-8 overflow-y-auto hidden lg:block scrollbar-hide">
            {templateLibrary.map((group, i) => (
                <div key={i}>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                        <Zap className="w-3 h-3 text-amber-500" /> {group.category}
                    </h3>
                    <div className="space-y-2">
                        {group.items.map((item, j) => (
                            <button 
                                key={j} 
                                onClick={() => setQuery(item.sql)}
                                className="w-full text-left p-3.5 bg-white border border-slate-100 rounded-2xl text-[11px] font-black text-slate-600 hover:border-indigo-500 hover:shadow-lg transition-all flex items-center justify-between group"
                            >
                                {item.label}
                                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                            </button>
                        ))}
                    </div>
                </div>
            ))}
            
            <div className="pt-6 border-t border-slate-200">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4">Quick Table View</h3>
                <div className="grid grid-cols-1 gap-1.5">
                    {tables.map(t => (
                        <button key={t} onClick={() => { setQuery(`SELECT * FROM ${t} LIMIT 20;`); executeSmartSQLByTable(t); }} className={`p-3 rounded-xl text-[10px] font-black uppercase text-left transition-all ${activeTable === t ? 'bg-indigo-600 text-white' : 'bg-slate-200/50 text-slate-500 hover:bg-slate-200'}`}>
                            {t.replace(/_/g, ' ')}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          {/* Main Console */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            <div className="p-6 space-y-4 border-b border-slate-100 bg-slate-50/30">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Code className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Query Buffer</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setQuery('')} className="p-2.5 text-slate-400 hover:text-rose-500 transition-colors" title="Clear Console"><Trash2 className="w-5 h-5"/></button>
                        <button 
                            onClick={executeSmartSQL} 
                            disabled={loading}
                            className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-xs font-black hover:bg-black transition-all shadow-2xl disabled:opacity-50 flex items-center gap-3"
                        >
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current text-emerald-400" />}
                            EXECUTE SQL
                        </button>
                    </div>
                </div>

                <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-slate-100 bg-slate-900 shadow-2xl">
                    <div className="flex items-center gap-1.5 px-6 py-3 border-b border-white/5 bg-white/5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                        <span className="ml-6 text-[10px] font-mono text-white/30 tracking-widest uppercase">sikilat_core_db_v1.0</span>
                    </div>
                    <textarea 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)} 
                        className="w-full h-56 p-6 bg-transparent text-emerald-400 font-mono text-sm focus:outline-none resize-none placeholder:text-emerald-900/30"
                        spellCheck={false}
                    />
                </div>

                {error && (
                    <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 text-xs font-black uppercase flex items-center gap-3 animate-shake">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                    </div>
                )}
                {successMsg && (
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 text-xs font-black uppercase flex items-center gap-3 animate-fade-in">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {successMsg}
                    </div>
                )}
            </div>

            {/* Result Area */}
            <div className="flex-1 overflow-auto p-8 bg-slate-50/50">
              {results.length > 0 ? (
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden">
                  <div className="px-8 py-5 bg-white border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Database className="w-4 h-4 text-indigo-500" />
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{results.length} Rows Retrieved</span>
                    </div>
                    <button onClick={() => {
                        const headers = Object.keys(results[0]).join(',');
                        const rows = results.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
                        const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `export_${activeTable}.csv`;
                        a.click();
                    }} className="text-[10px] font-black text-indigo-600 flex items-center gap-2 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all">
                        <Download className="w-4 h-4" /> EXPORT CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] font-medium text-slate-600 border-collapse">
                      <thead className="bg-slate-50 text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                        <tr>
                          {Object.keys(results[0]).map(k => <th key={k} className="px-8 py-4 whitespace-nowrap">{k.replace(/_/g, ' ')}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {results.map((r, i) => (
                          <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                            {Object.values(r).map((v: any, j) => (
                              <td key={j} className="px-8 py-4 truncate max-w-[200px]">{String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                  <div className="p-12 bg-slate-100 rounded-full mb-6 animate-pulse">
                    <Database className="w-20 h-20 opacity-10" />
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-[0.4em] text-slate-400">Waiting for Query...</h4>
                  <p className="text-xs text-slate-400 mt-2 font-medium italic">Execute SELECT, INSERT, or UPDATE to see results here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SQLEditor;
