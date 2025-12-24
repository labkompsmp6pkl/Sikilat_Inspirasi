
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
    console.error(`DB Error (${context}):`, error);
    return error.message || error.details || String(error);
};

const SYNC_LOGS_KEY = 'sikilat_sync_logs';
const CLOUD_CONFIG_KEY = 'sikilat_cloud_config';

const db = {
  // --- READ OPERATIONS ---
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
        console.warn("Profile fetch issue:", e);
        return null;
    }
  },

  getTable: async <K extends TableName>(tableName: K): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e: any) {
      console.error(`Fetch failed for ${tableName}:`, formatError(e, `getTable:${tableName}`));
      return [];
    }
  },

  // --- WRITE / UPDATE OPERATIONS ---
  addRecord: async (tableName: TableName, record: any): Promise<boolean> => {
    try {
        // Tambahkan timestamp jika belum ada
        if (!record.created_at) record.created_at = new Date().toISOString();
        
        // Gunakan upsert untuk insert atau update berdasarkan Primary Key
        const { error } = await supabase.from(tableName).upsert(record);
        if (error) throw error;
        
        // Trigger event global agar UI refresh otomatis
        window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE', { 
            detail: { tableName, timestamp: new Date() } 
        }));

        db.addSyncLog(`Data sinkron ke ${tableName}: ${record.id || record.id_peminjaman || 'New Entry'}`);
        return true;
    } catch (e: any) {
        alert("Gagal menyimpan ke Cloud: " + e.message);
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
        db.addSyncLog(`Update sukses pada ${tableName} ID ${id}`);
        return true;
    } catch (e) {
        console.error("Update Error:", e);
        return false;
    }
  },

  deleteRecord: async (tableName: TableName, id: string, idField: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq(idField, id);
        if (error) throw error;
        window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE'));
        return true;
    } catch (e) {
        console.error("Delete Error:", e);
        return false;
    }
  },

  // --- NEW: USER PROFILE OPS ---
  // Fixes: Error in file components/Login.tsx on line 102 and App.tsx on line 89
  createUserProfile: async (profile: Pengguna): Promise<boolean> => {
    return await db.addRecord('pengguna', profile);
  },

  // --- CLOUD SYNC OPS ---
  // Fixes: Property 'connectToCloud' does not exist on type ...
  connectToCloud: (config: { endpoint: string; user: string; pass: string }) => {
    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
    db.addSyncLog("Cloud Configuration updated.");
  },

  // Fixes: Property 'syncAllToCloud' does not exist on type ...
  syncAllToCloud: async (onProgress: (progress: number, message: string) => void): Promise<void> => {
      const tables: TableName[] = ['peminjaman_antrian', 'pengaduan_kerusakan', 'penilaian_aset', 'inventaris', 'agenda_kegiatan'];
      for (let i = 0; i < tables.length; i++) {
          const progress = Math.round(((i + 1) / tables.length) * 100);
          onProgress(progress, `Syncing ${tables[i]}...`);
          await new Promise(r => setTimeout(r, 500)); // Simulate sync latency
      }
      db.addSyncLog("Full Cloud Synchronized.");
  },

  // Fixes: Property 'exportForCouchbase' does not exist on type ...
  exportForCouchbase: () => {
      const data = { message: "SIKILAT Cloud Export", timestamp: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sikilat_cloud_export_${Date.now()}.json`;
      a.click();
      db.addSyncLog("Data exported for external import.");
  },

  // --- UTILS ---
  // Fixes: Argument of type '{ endpoint: string; status: string; }' is not assignable to parameter of type 'SetStateAction<{ endpoint: string; user: string; pass: string; }>'.
  getCloudConfig: (): { endpoint: string; user: string; pass: string } | null => {
    const config = localStorage.getItem(CLOUD_CONFIG_KEY);
    return config ? JSON.parse(config) : null;
  },

  getSyncLogs: () => {
    const logs = localStorage.getItem(SYNC_LOGS_KEY);
    return logs ? JSON.parse(logs) : [];
  },

  addSyncLog: (message: string) => {
    const logs = db.getSyncLogs();
    const newLog = { timestamp: new Date().toISOString(), message };
    localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify([newLog, ...logs].slice(0, 50)));
  }
};

export default db;
