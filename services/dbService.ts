
import {
  MOCK_PENGADUAN_KERUSAKAN,
  MOCK_PEMINJAMAN_ANTRIAN,
  MOCK_INVENTARIS,
  MOCK_LOKASI,
  MOCK_USERS,
  MOCK_AGENDA_KEGIATAN,
  MOCK_PENILAIAN_ASET
} from '../constants';
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

const DB_PREFIX = 'SIKILAT_DB_';

const DEFAULT_CLOUD_CONFIG = {
    endpoint: 'https://olafeazxxrxitfxksxoy.supabase.co',
    user: 'anon',
    pass: 'hidden',
    autoSync: true,
    lastSyncCount: 18,
    type: 'supabase'
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

const db = {
  initialize: async () => {
    if (!localStorage.getItem('SIKILAT_CLOUD_CONFIG')) {
        localStorage.setItem('SIKILAT_CLOUD_CONFIG', JSON.stringify(DEFAULT_CLOUD_CONFIG));
    }
  },

  // Mendapatkan profil pengguna berdasarkan ID Auth Supabase
  getUserProfile: async (userId: string): Promise<Pengguna | null> => {
    try {
        const { data, error } = await supabase
            .from('pengguna')
            .select('*')
            .eq('id_pengguna', userId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (e) {
        console.error("Gagal mengambil profil pengguna:", e);
        return null;
    }
  },

  // Membuat profil pengguna baru di tabel database
  createUserProfile: async (profile: Pengguna) => {
    try {
        const { error } = await supabase.from('pengguna').insert(profile);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error("Gagal membuat profil database:", e);
        return false;
    }
  },

  getTable: async <K extends TableName>(tableName: K): Promise<TableMap[K][]> => {
    try {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) throw error;
      
      if (data && data.length > 0) {
        return data.map(item => ({ ...item, cloud_synced: true }));
      }
    } catch (e) {
      console.warn(`Supabase fetch failed for ${tableName}`, e);
    }
    return [];
  },

  saveTable: <K extends TableName>(tableName: K, data: TableMap[K][]) => {
    const key = `${DB_PREFIX}${tableName}`;
    localStorage.setItem(key, JSON.stringify(data));
  },

  addRecord: async (tableName: TableName, record: any): Promise<boolean> => {
    const recordWithStatus = { ...record, cloud_synced: false, sync_at: new Date() };
    
    // Tigger Cloud Update
    return await db.autoPushToCloud(tableName, recordWithStatus);
  },

  autoPushToCloud: async (tableName: TableName, record: any) => {
      const config = db.getCloudConfig();
      const recordKey = 'id' in record ? 'id' : 
                        'id_peminjaman' in record ? 'id_peminjaman' : 
                        'id_barang' in record ? 'id_barang' : 
                        'id_pengguna' in record ? 'id_pengguna' : 'id';
      
      const recordId = record[recordKey];
      
      try {
          const { error } = await supabase.from(tableName).upsert(record);
          if (error) throw error;

          config.lastSyncCount = (config.lastSyncCount || 18) + 1;
          localStorage.setItem('SIKILAT_CLOUD_CONFIG', JSON.stringify(config));
          
          db.addSyncLog(`Supabase SUCCESS: ID ${recordId} synced`);
          window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE', { detail: { tableName, recordId } }));
          return true;
      } catch (e) {
          db.addSyncLog(`Supabase ERROR: Failed to sync ${recordId}`);
          console.error('Cloud Sync Error:', e);
          return false;
      }
  },

  // Fix: Added syncAllToCloud to perform full table synchronization with Supabase
  syncAllToCloud: async (onProgress: (progress: number, message: string) => void) => {
    const tables: TableName[] = ['pengaduan_kerusakan', 'peminjaman_antrian', 'pengguna', 'inventaris', 'lokasi', 'agenda_kegiatan', 'penilaian_aset'];
    onProgress(0, 'Menghubungi Supabase...');
    
    for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const progress = Math.round(((i + 1) / tables.length) * 100);
        onProgress(progress, `Sinkronisasi tabel: ${table}`);
        
        try {
            // Simulasi sinkronisasi dengan delay untuk UX yang lebih baik
            await new Promise(resolve => setTimeout(resolve, 500));
            const { data } = await supabase.from(table).select('*');
            if (data) {
                db.saveTable(table, data as any);
            }
        } catch (e) {
            console.error(`Sync error: ${table}`, e);
        }
    }
    
    db.addSyncLog('SINKRONISASI CLOUD SELESAI');
    onProgress(100, 'Berhasil sinkronisasi seluruh data.');
    window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE'));
  },

  // Fix: Added exportForCouchbase to generate and download a JSON backup of the local state
  exportForCouchbase: () => {
    const tables: TableName[] = ['pengaduan_kerusakan', 'peminjaman_antrian', 'pengguna', 'inventaris', 'lokasi', 'agenda_kegiatan', 'penilaian_aset'];
    const exportData: any = {};
    
    tables.forEach(table => {
        const key = `${DB_PREFIX}${table}`;
        const data = localStorage.getItem(key);
        exportData[table] = data ? JSON.parse(data) : [];
    });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sikilat_couchbase_export_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    db.addSyncLog('DATA DIEKSPOR KE JSON');
  },

  getCloudConfig: () => {
      const config = localStorage.getItem('SIKILAT_CLOUD_CONFIG');
      return config ? JSON.parse(config) : DEFAULT_CLOUD_CONFIG;
  },

  addSyncLog: (message: string) => {
      const logs = JSON.parse(localStorage.getItem('SIKILAT_SYNC_LOGS') || '[]');
      logs.unshift({ 
          timestamp: new Date(), 
          message,
          id: Math.random().toString(36).substr(2, 9)
      });
      localStorage.setItem('SIKILAT_SYNC_LOGS', JSON.stringify(logs.slice(0, 50)));
      window.dispatchEvent(new Event('SIKILAT_LOGS_UPDATED'));
  },

  getSyncLogs: () => {
      return JSON.parse(localStorage.getItem('SIKILAT_SYNC_LOGS') || '[]');
  },

  connectToCloud: (config: { endpoint: string; user: string; pass: string }) => {
      localStorage.setItem('SIKILAT_CLOUD_CONFIG', JSON.stringify({ ...config, autoSync: true, type: 'supabase' }));
      db.addSyncLog(`SUPABASE RE-CONNECTED`);
      return true;
  }
};

db.initialize();
export default db;
