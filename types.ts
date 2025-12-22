
import React from 'react';

export type UserRole = 
  | 'guru' 
  | 'penanggung_jawab' 
  | 'pengawas_it' 
  | 'pengawas_sarpras' 
  | 'pengawas_admin' 
  | 'admin' 
  | 'tamu';

// Database Schema Interfaces
export interface AgendaKegiatan {
  id: string;
  id_pj?: string;
  nama_pj?: string;
  waktu_mulai: string | Date;
  waktu_selesai: string | Date;
  posisi: string;
  uraian_kegiatan: string;
  hasil_kegiatan: string;
  objek_pengguna: string;
  status: 'Pending' | 'Disetujui' | 'Ditolak';
}

export interface Inventaris {
  id_barang: string;
  nama_barang: string;
  kategori: 'IT' | 'Sarpras' | 'General';
  status_barang: 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | 'Perbaikan';
  id_lokasi: string;
}

export interface PenilaianAset {
  id: string;
  id_barang: string;
  nama_barang: string;
  id_pengguna: string;
  nama_pengguna: string;
  skor: number; // 1-5 stars
  ulasan: string;
  tanggal: Date;
  // New interaction fields
  balasan_admin?: string;
  tanggal_balasan?: Date;
  tanggapan_tamu?: string;
  status_penanganan?: 'Terbuka' | 'Selesai';
}

export interface Pengguna {
  id_pengguna: string;
  nama_lengkap: string;
  email: string;
  no_hp: string;
  peran: UserRole;
  kelas_id?: string;
  wali_kelas_id?: string;
  avatar: string; 
}

export interface PengaduanKerusakan {
  id: string;
  id_barang: string;
  id_pengadu: string;
  tanggal_lapor: Date;
  deskripsi_masalah: string;
  status: 'Pending' | 'Proses' | 'Selesai';
  kategori_aset: 'IT' | 'Sarpras' | 'General';
  nama_barang: string;
  nama_pengadu: string;
  lokasi_kerusakan: string;
  diselesaikan_oleh?: string;
  catatan_penyelesaian?: string;
}

export interface PeminjamanAntrian {
  id_peminjaman: string;
  id_barang: string;
  nama_barang: string;
  id_pengguna: string;
  tanggal_peminjaman: Date;
  jam_mulai?: string;
  jam_selesai?: string;
  keperluan?: string;
  tanggal_pengembalian_rencana: Date;
  tanggal_pengembalian_aktual?: Date;
  status_peminjaman: 'Menunggu' | 'Disetujui' | 'Ditolak' | 'Kembali';
  alasan_penolakan?: string;
}

export interface Lokasi {
  id_lokasi: string;
  nama_lokasi: string;
}

export interface Kelas {
  id_kelas: string;
  nama_kelas: string;
}

export type User = Pengguna;

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  imageUrl?: string;
  replyTo?: Message;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'datetime-local' | 'select' | 'date' | 'dropdown' | 'creatable-select' | 'number';
  options?: string[];
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
}

export interface FormTemplate {
  id: string;
  title: string;
  fields: FormField[];
  submitLabel: string;
}

export interface QuickAction {
  label: string | ((stats: any) => React.ReactNode);
  prompt: string;
  icon: React.FC<any>;
  formId?: string;
}

export interface RoleConfig {
  id: UserRole;
  label: string;
  icon: React.FC<any>;
  color: string;
  description: string;
  transformativeValue: string;
  actions: QuickAction[];
}

export interface ChatInterfaceProps {
  user: User;
  roleConfig: RoleConfig;
  onDataSaved: (data: SavedData) => void;
  stats: any;
  isOpen: boolean;
  onToggle: () => void;
  externalMessage?: string | null;
  onClearExternalMessage?: () => void;
}

export interface HistorySection {
  items: any[];
}

export interface DetailedItemReport {
  type: 'detailed_item_report';
  id_inventaris: string;
  nama_barang: string;
  status_barang: string;
  riwayat_kerusakan?: HistorySection;
  catatan_teknis?: HistorySection;
  riwayat_peminjaman?: HistorySection;
}

export interface TroubleshootingGuide {
  type: 'troubleshooting_guide';
  id_tiket: string;
  judul: string;
  gejala: string;
  langkah_penanganan: {
    urutan: number;
    tindakan: string;
    detail: string;
  }[];
  tips_terbaik: {
    teks: string;
  }[];
  analisis_solusi: {
    kelebihan: string[];
    kekurangan: string[];
  };
}

export interface LaporanStatus {
  type: 'laporan_status';
  id_laporan: string;
  status_laporan: string;
  deskripsi_laporan: string;
  catatan_status: string;
  tanggal_update: string;
}

export interface QueueStatus {
    type: 'queue_status';
    nama_barang: string;
    sedang_dipakai: boolean;
    pemakai_saat_ini?: { nama: string; sampai_jam: string };
    jumlah_antrian: number;
    antrian_berikutnya: any[];
}

export type TableName = 'pengaduan_kerusakan' | 'peminjaman_antrian' | 'pengguna' | 'inventaris' | 'lokasi' | 'agenda_kegiatan' | 'penilaian_aset';

export interface SavedData {
    table: TableName;
    payload: any;
}

export interface GeminiResponse {
    text: string;
    dataToSave?: SavedData;
}
