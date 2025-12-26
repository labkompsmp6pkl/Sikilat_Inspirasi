
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
      const { error } = await supabase.from('pengguna').upsert(profile);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Create profile error:", e);
      return false;
    }
  },

  // --- CORE CRUD ---
  getTable: async <K extends TableName>(tableName: K): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error(`Fetch error ${tableName}:`, e);
      return [];
    }
  },

  addRecord: async (tableName: TableName, record: any): Promise<boolean> => {
    try {
      if (!record.created_at) record.created_at = new Date().toISOString();
      
      // We log the detailed record to see what's being sent
      console.debug(`Attempting to add record to ${tableName}:`, record);
      
      const { data, error } = await supabase.from(tableName).upsert(record).select();
      
      if (error) {
        console.error("Supabase AddRecord Error Details:", JSON.stringify(error, null, 2));
        throw error;
      }
      
      db.addSyncLog(`Entry baru di ${tableName}: ${record.id || record.id_peminjaman || 'Success'}`);
      window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE'));
      return true;
    } catch (e: any) {
      // Better error logging to avoid [object Object]
      console.error("Add Record Failed:", e.message || e.details || e);
      return false;
    }
  },

  updateStatus: async (tableName: TableName, id: string, idField: string, updates: any): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from(tableName)
        .update(updates)
        .eq(idField, id);
      
      if (error) {
        console.error("Supabase Update Error Details:", JSON.stringify(error, null, 2));
        throw error;
      }

      db.addSyncLog(`Update ${tableName} ID ${id} berhasil.`);
      window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE'));
      return true;
    } catch (e: any) {
      console.error("Update failed:", e.message || e.details || e);
      return false;
    }
  },

  // --- CLOUD CONFIG & UTILS ---
  getCloudConfig: () => {
    const config = localStorage.getItem(CLOUD_CONFIG_KEY);
    return config ? JSON.parse(config) : { endpoint: 'Supabase Cloud Node', user: 'active', pass: '******', lastSyncCount: 0 };
  },

  connectToCloud: (config: any) => {
    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
    db.addSyncLog("Konfigurasi Cloud diperbarui.");
  },

  syncAllToCloud: async (callback: (p: number, m: string) => void) => {
    const tables: TableName[] = ['inventaris', 'pengaduan_kerusakan', 'peminjaman_antrian', 'agenda_kegiatan'];
    for (let i = 0; i < tables.length; i++) {
      callback(Math.round(((i + 1) / tables.length) * 100), `Sinkronisasi ${tables[i]}...`);
      await new Promise(r => setTimeout(r, 400));
    }
    window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE'));
  },

  exportForCouchbase: () => {
    const data = { app: "SIKILAT", timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sikilat_backup_${Date.now()}.json`;
    a.click();
  },

  getSyncLogs: () => JSON.parse(localStorage.getItem(SYNC_LOGS_KEY) || '[]'),
  addSyncLog: (message: string) => {
    const logs = db.getSyncLogs();
    const newLog = { timestamp: new Date().toISOString(), message };
    localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify([newLog, ...logs].slice(0, 50)));
  }
};

export default db;
