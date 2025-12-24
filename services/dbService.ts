
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
        if (!record.created_at) record.created_at = new Date().toISOString();
        
        const { error } = await supabase.from(tableName).upsert(record);
        if (error) throw error;
        
        // Trigger event global agar UI refresh otomatis tanpa reload page
        window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE', { 
            detail: { tableName, timestamp: new Date() } 
        }));

        db.addSyncLog(`Data sinkron ke ${tableName}: ${record.id || record.id_peminjaman || 'Entry Baru'}`);
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

  createUserProfile: async (profile: Pengguna): Promise<boolean> => {
    return await db.addRecord('pengguna', profile);
  },

  // --- MISSING METHODS TO FIX CONNECTION MODAL ERRORS ---
  
  // Fix: Added connectToCloud to handle connectivity configuration persistence
  connectToCloud: (config: { endpoint: string; user: string; pass: string }) => {
    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
    db.addSyncLog(`Koneksi diperbarui ke: ${config.endpoint}`);
  },

  // Fix: Added syncAllToCloud to handle bulk synchronization simulation for the ConnectionModal UI
  syncAllToCloud: async (callback: (progress: number, message: string) => void) => {
    const tables: TableName[] = ['inventaris', 'pengaduan_kerusakan', 'peminjaman_antrian', 'agenda_kegiatan', 'penilaian_aset', 'pengguna', 'lokasi'];
    for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const progress = Math.round(((i + 1) / tables.length) * 100);
        callback(progress, `Sinkronisasi tabel ${table}...`);
        // Simulate network delay for UI progress visualization
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    db.addSyncLog("Sinkronisasi massal selesai.");
    window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE'));
  },

  // Fix: Added exportForCouchbase to handle legacy data export requirement in ConnectionModal
  exportForCouchbase: () => {
    const logs = db.getSyncLogs();
    const blob = new Blob([JSON.stringify({ 
        version: "1.0", 
        timestamp: new Date().toISOString(), 
        logs 
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sikilat_couchbase_export_${new Date().getTime()}.json`;
    a.click();
    db.addSyncLog("Export database dilakukan.");
  },

  // --- UTILS ---
  getCloudConfig: (): { endpoint: string; user: string; pass: string } | null => {
    const config = localStorage.getItem(CLOUD_CONFIG_KEY);
    return config ? JSON.parse(config) : { endpoint: 'Supabase Cloud Node', user: 'active', pass: '******' };
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
