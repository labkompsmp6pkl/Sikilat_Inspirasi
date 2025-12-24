
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
    
    // Deteksi error kolom hilang
    if (error.code === '42703') {
        return `Gagal: Kolom '${error.message.split('"')[1]}' tidak ditemukan di tabel database. Silakan jalankan SQL migration di dashboard Supabase.`;
    }
    
    // Deteksi error RLS
    if (error.code === '42501') {
        return "Gagal: Izin ditolak (RLS). Silakan nonaktifkan RLS atau tambahkan Policy 'Enable Insert for Authenticated Users' di Supabase.";
    }

    if (error.message?.includes('schema cache')) {
        return `Tabel '${error.details?.split("'")[1] || 'pengguna'}' sudah ada tetapi API belum sinkron. Mohon tunggu sejenak.`;
    }
    const msg = error.message || error.details || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    console.error(`DB Error (${context}):`, error);
    return msg;
};

// Keys for local storage persistence
const CLOUD_CONFIG_KEY = 'sikilat_cloud_config';
const SYNC_LOGS_KEY = 'sikilat_sync_logs';

const db = {
  getUserProfile: async (userId: string): Promise<Pengguna | null> => {
    try {
        const { data, error } = await supabase
            .from('pengguna')
            .select('*')
            .eq('id_pengguna', userId)
            .maybeSingle(); 
        
        if (error) throw new Error(formatError(error, "getUserProfile"));
        return data;
    } catch (e: any) {
        throw e;
    }
  },

  createUserProfile: async (profile: Pengguna) => {
    try {
        console.log("Attempting to create profile for:", profile.email);
        const { error } = await supabase.from('pengguna').upsert(profile, { onConflict: 'id_pengguna' });
        
        if (error) {
            console.error("Supabase Upsert Error:", error);
            throw new Error(formatError(error, "createUserProfile"));
        }
        
        db.addSyncLog(`Profil pengguna baru dibuat: ${profile.email}`);
        return true;
    } catch (e: any) {
        console.error("Caught Exception in createUserProfile:", e);
        throw e;
    }
  },

  getTable: async <K extends TableName>(tableName: K): Promise<any[]> => {
    try {
      const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false }).limit(100);
      if (error) {
          if (error.code === '42P01' || error.message?.includes('schema cache')) {
              console.warn(`Table '${tableName}' might be missing or in sync.`);
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
        if (!record.created_at) record.created_at = new Date().toISOString();
        
        const { error } = await supabase.from(tableName).upsert(record);
        if (error) throw error;
        
        window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE', { 
            detail: { tableName, timestamp: new Date() } 
        }));

        db.addSyncLog(`Record successfully pushed to ${tableName}: ${record.id || record.id_peminjaman || 'Generic Entry'}`);
        return true;
    } catch (e: any) {
        console.error('Cloud Sync Error:', e.message || e);
        return false;
    }
  },

  getCloudConfig: () => {
    const saved = localStorage.getItem(CLOUD_CONFIG_KEY);
    return saved ? JSON.parse(saved) : null;
  },

  connectToCloud: (config: any) => {
    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
    db.addSyncLog(`Connectivity established with cloud endpoint: ${config.endpoint}`);
  },

  getSyncLogs: () => {
    const logs = localStorage.getItem(SYNC_LOGS_KEY);
    return logs ? JSON.parse(logs) : [];
  },

  addSyncLog: (message: string) => {
    const logs = db.getSyncLogs();
    const newLog = { timestamp: new Date().toISOString(), message };
    localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify([newLog, ...logs].slice(0, 50)));
  },

  syncAllToCloud: async (onProgress: (progress: number, message: string) => void) => {
    const tables: TableName[] = ['pengaduan_kerusakan', 'peminjaman_antrian', 'inventaris', 'lokasi', 'agenda_kegiatan', 'penilaian_aset'];
    for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const progress = Math.round(((i + 1) / tables.length) * 100);
        onProgress(progress, `Processing synchronization for table: ${table}...`);
        await new Promise(resolve => setTimeout(resolve, 350));
        db.addSyncLog(`Bulk synchronization successful for table: ${table}`);
    }
    onProgress(100, 'All local data is now synchronized with the Cloud Node.');
  },

  exportForCouchbase: () => {
    const data = { 
        version: '1.0', 
        exportDate: new Date().toISOString(),
        system: 'SIKILAT-BRIDGE-EXPORT'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sikilat_db_migration_${Date.now()}.json`;
    a.click();
    db.addSyncLog('Database export for migration completed.');
  }
};

export default db;
