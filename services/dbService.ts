
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

  getSyncLogs: () => JSON.parse(localStorage.getItem(SYNC_LOGS_KEY) || '[]'),
  addSyncLog: (message: string) => {
    const logs = db.getSyncLogs();
    const newLog = { timestamp: new Date().toISOString(), message };
    localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify([newLog, ...logs].slice(0, 50)));
  }
};

export default db;
