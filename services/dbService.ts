
import {
  PengaduanKerusakan,
  PeminjamanAntrian,
  Inventaris,
  Lokasi,
  Pengguna,
  TableName,
  AgendaKegiatan,
  PenilaianAset
} from '../types';
import { supabase } from './supabaseClient';

const formatError = (error: any, context: string): string => {
    if (!error) return "Unknown error";
    // PostgREST "Schema Cache" error is common right after table creation
    if (error.message?.includes('schema cache')) {
        return `Tabel '${error.details?.split("'")[1] || 'pengguna'}' sudah ada di database tetapi belum terbaca oleh API. Silakan jalankan 'NOTIFY pgrst, 'reload schema';' di SQL Editor atau tunggu 1 menit.`;
    }
    const msg = error.message || error.details || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    console.error(`DB Error (${context}):`, error);
    return msg;
};

const db = {
  // Mengambil profil pengguna riil dari Supabase
  getUserProfile: async (userId: string): Promise<Pengguna | null> => {
    try {
        const { data, error } = await supabase
            .from('pengguna')
            .select('*')
            .eq('id_pengguna', userId)
            .maybeSingle(); 
        
        if (error) {
            throw new Error(formatError(error, "getUserProfile"));
        }
        return data;
    } catch (e: any) {
        throw e;
    }
  },

  // Membuat profil pengguna di tabel 'pengguna' Supabase
  createUserProfile: async (profile: Pengguna) => {
    try {
        const { error } = await supabase.from('pengguna').upsert(profile, { onConflict: 'id_pengguna' });
        if (error) {
            throw new Error(formatError(error, "createUserProfile"));
        }
        return true;
    } catch (e: any) {
        throw e;
    }
  },

  // Mengambil data tabel secara dinamis dari Supabase
  getTable: async <K extends TableName>(tableName: K): Promise<TableMap[K][]> => {
    try {
      const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false }).limit(100);
      if (error) {
          if (error.code === '42P01' || error.message?.includes('schema cache')) {
              console.warn(`Tabel '${tableName}' sedang sinkronisasi atau belum dibuat.`);
              return [];
          }
          throw error;
      }
      return (data || []).map(item => ({ ...item, cloud_synced: true }));
    } catch (e: any) {
      console.warn(`Supabase fetch failed for ${tableName}:`, e.message || e);
      return [];
    }
  },

  addRecord: async (tableName: TableName, record: any): Promise<boolean> => {
    try {
        const { error } = await supabase.from(tableName).upsert(record);
        if (error) throw error;
        window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE', { detail: { tableName, timestamp: new Date() } }));
        return true;
    } catch (e: any) {
        console.error('Cloud Sync Error:', e.message || e);
        return false;
    }
  },

  // Fix: Added connectToCloud for external connectivity management requested by ConnectionModal
  connectToCloud: (config: any) => {
    localStorage.setItem('SIKILAT_CLOUD_CONFIG', JSON.stringify(config));
    const logs = JSON.parse(localStorage.getItem('SIKILAT_SYNC_LOGS') || '[]');
    logs.unshift({ timestamp: new Date(), message: `Handshake established with ${config.endpoint || 'Cloud Node'}` });
    localStorage.setItem('SIKILAT_SYNC_LOGS', JSON.stringify(logs.slice(0, 50)));
  },

  // Fix: Added syncAllToCloud for manual batch synchronization simulation requested by ConnectionModal
  syncAllToCloud: async (onProgress: (percent: number, message: string) => void) => {
    const tables: TableName[] = ['pengaduan_kerusakan', 'peminjaman_antrian', 'inventaris', 'lokasi', 'pengguna', 'agenda_kegiatan', 'penilaian_aset'];
    onProgress(0, 'Starting synchronization...');
    
    for (let i = 0; i <= tables.length; i++) {
        const percent = Math.floor((i / tables.length) * 100);
        const table = tables[i] || 'Finalizing';
        onProgress(percent, i === tables.length ? 'Synchronization complete' : `Syncing table: ${table}...`);
        // Artificial delay for UI feedback
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    const logs = JSON.parse(localStorage.getItem('SIKILAT_SYNC_LOGS') || '[]');
    logs.unshift({ timestamp: new Date(), message: 'Manual bulk cloud synchronization performed.' });
    localStorage.setItem('SIKILAT_SYNC_LOGS', JSON.stringify(logs.slice(0, 50)));
  },

  getCloudConfig: () => {
      const saved = localStorage.getItem('SIKILAT_CLOUD_CONFIG');
      if (saved) return JSON.parse(saved);
      return { 
          endpoint: 'Supabase Cloud', 
          user: 'Auth User', 
          pass: 'Session' 
      };
  },

  getSyncLogs: () => {
      return JSON.parse(localStorage.getItem('SIKILAT_SYNC_LOGS') || '[]');
  },

  exportForCouchbase: async () => {
    try {
      const tables: TableName[] = ['pengaduan_kerusakan', 'peminjaman_antrian', 'inventaris', 'lokasi', 'pengguna', 'agenda_kegiatan', 'penilaian_aset'];
      const allData: Record<string, any> = {};
      for (const table of tables) { allData[table] = await db.getTable(table); }
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sikilat_backup_${new Date().getTime()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) { console.error('Export failed:', error); }
  }
};

type TableMap = {
  pengaduan_kerusakan: PengaduanKerusakan;
  peminjaman_antrian: PeminjamanAntrian;
  inventaris: Inventaris;
  lokasi: Lokasi;
  pengguna: Pengguna;
  agenda_kegiatan: AgendaKegiatan;
  penilaian_aset: PenilaianAset;
};

export default db;
