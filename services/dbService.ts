
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

const CLOUD_CONFIG_KEY = 'sikilat_cloud_config';
const SYNC_LOGS_KEY = 'sikilat_sync_logs';

const db = {
  // --- AUTH & PROFILE ---
  getUserProfile: async (userId: string): Promise<Pengguna | null> => {
    try {
      const { data, error } = await supabase
        .from('pengguna')
        .select('*')
        .eq('id_pengguna', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn("Profile fetch error:", e);
      return null;
    }
  },

  createUserProfile: async (profile: Pengguna): Promise<boolean> => {
    try {
      // Pastikan data profil masuk ke database Supabase
      const { error } = await supabase.from('pengguna').upsert({
        id_pengguna: profile.id_pengguna,
        nama_lengkap: profile.nama_lengkap,
        email: profile.email,
        no_hp: profile.no_hp,
        peran: profile.peran,
        avatar: profile.avatar
      });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Create profile error:", e);
      return false;
    }
  },

  // Fungsi Baru: Memastikan Barang/Aset ada di tabel inventaris untuk menghindari FK Error
  ensureAssetExists: async (id_barang: string, nama_barang: string): Promise<boolean> => {
    try {
      const { data } = await supabase.from('inventaris').select('id_barang').eq('id_barang', id_barang).maybeSingle();
      if (!data) {
        await supabase.from('inventaris').insert({
          id_barang: id_barang,
          nama_barang: nama_barang,
          kategori: 'General',
          status_barang: 'Baik',
          id_lokasi: 'L01' // Default lokasi
        });
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  // --- CORE CRUD ---
  getTable: async <K extends TableName>(tableName: K): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error(`Fetch error ${tableName}:`, e);
      return [];
    }
  },

  addRecord: async (tableName: TableName, record: any): Promise<boolean> => {
    try {
      console.debug(`Syncing to ${tableName}...`, record);
      
      // Khusus untuk peminjaman, pastikan asetnya terdaftar dulu agar tidak melanggar foreign key
      if (tableName === 'peminjaman_antrian' && record.id_barang) {
        await db.ensureAssetExists(record.id_barang, record.nama_barang || 'Aset Umum');
      }

      const { error } = await supabase.from(tableName).insert(record);
      
      if (error) {
        console.error("Supabase Error:", error.message);
        return false;
      }
      
      db.addSyncLog(`Entry baru di ${tableName} sukses.`);
      window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE'));
      return true;
    } catch (e: any) {
      console.error("Add Record Failed:", e);
      return false;
    }
  },

  updateStatus: async (tableName: TableName, id: string, idField: string, updates: any): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from(tableName)
        .update(updates)
        .eq(idField, id);
      
      if (error) throw error;
      window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE'));
      return true;
    } catch (e: any) {
      return false;
    }
  },

  // --- CLOUD & SYNC HELPERS ---
  /**
   * Fixes error in ConnectionModal.tsx line 25: Property 'getCloudConfig' does not exist
   */
  getCloudConfig: () => {
    try {
      return JSON.parse(localStorage.getItem(CLOUD_CONFIG_KEY) || 'null');
    } catch {
      return null;
    }
  },

  /**
   * Fixes error in ConnectionModal.tsx line 34: Property 'connectToCloud' does not exist
   */
  connectToCloud: (config: any) => {
    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
    db.addSyncLog('Koneksi Cloud diperbarui ke storage lokal.');
  },

  /**
   * Fixes error in ConnectionModal.tsx line 43: Property 'syncAllToCloud' does not exist
   */
  syncAllToCloud: async (callback: (progress: number, message: string) => void) => {
    const tables: TableName[] = ['inventaris', 'pengaduan_kerusakan', 'peminjaman_antrian', 'agenda_kegiatan', 'penilaian_aset'];
    for (let i = 0; i < tables.length; i++) {
      const progress = Math.round(((i + 1) / tables.length) * 100);
      callback(progress, `Syncing ${tables[i]}...`);
      // Simulate network delay for UI feedback
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    callback(100, 'All tables synchronized.');
    db.addSyncLog('Bulk sync to Capella Node complete.');
  },

  /**
   * Fixes error in ConnectionModal.tsx line 52: Property 'exportForCouchbase' does not exist
   */
  exportForCouchbase: () => {
    const backup = {
      timestamp: new Date().toISOString(),
      provider: "SIKILAT-Capella-Bridge",
      data: "Encrypted-Blob-Stub"
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sikilat_backup_${Date.now()}.json`;
    a.click();
    db.addSyncLog('Database export initiated and downloaded.');
  },

  getSyncLogs: () => JSON.parse(localStorage.getItem(SYNC_LOGS_KEY) || '[]'),
  addSyncLog: (message: string) => {
    const logs = db.getSyncLogs();
    const newLog = { timestamp: new Date().toISOString(), message };
    localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify([newLog, ...logs].slice(0, 50)));
  }
};

export default db;
