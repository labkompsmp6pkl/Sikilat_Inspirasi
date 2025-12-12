
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
  id_pj?: string; // FK to Pengguna
  nama_pj?: string; // Denormalized for display
  waktu_mulai: string | Date; // Allow string from form input
  waktu_selesai: string | Date;
  posisi: string;
  uraian_kegiatan: string;
  hasil_kegiatan: string;
  objek_pengguna: string;
  status: 'Pending' | 'Disetujui' | 'Ditolak'; // Added for approval workflow
}

export interface Inventaris {
  id_barang: string;
  nama_barang: string;
  kategori: 'IT' | 'Sarpras' | 'General';
  status_barang: 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | 'Perbaikan';
  id_lokasi: string; // FK to Lokasi
}

export interface Pengguna {
  id_pengguna: string;
  nama_lengkap: string;
  email: string;
  no_hp: string;
  peran: UserRole;
  kelas_id?: string; // FK to Kelas
  wali_kelas_id?: string;
  // UI Helper fields (not strictly in DB schema but needed for app)
  avatar: string; 
}

export interface PengaduanKerusakan {
  id: string;
  id_barang: string; // FK to Inventaris
  id_pengadu: string; // FK to Pengguna
  tanggal_lapor: Date;
  deskripsi_masalah: string;
  status: 'Pending' | 'Proses' | 'Selesai';
  kategori_aset: 'IT' | 'Sarpras' | 'General'; // Added for chart categorization
  nama_barang: string; // Added for easier access
  nama_pengadu: string;
  lokasi_kerusakan: string;
  // New fields for resolution tracking
  diselesaikan_oleh?: string;
  catatan_penyelesaian?: string;
}

export interface PeminjamanAntrian {
  id_peminjaman: string;
  id_barang: string; // FK to Inventaris
  nama_barang: string; // Added for easier display
  id_pengguna: string; // FK to Pengguna
  tanggal_peminjaman: Date;
  jam_mulai?: string;
  jam_selesai?: string;
  keperluan?: string;
  tanggal_pengembalian_rencana: Date;
  tanggal_pengembalian_aktual?: Date;
  status_peminjaman: 'Menunggu' | 'Disetujui' | 'Ditolak' | 'Kembali';
  alasan_penolakan?: string; // Added field for rejection reason
}

export interface Lokasi {
  id_lokasi: string;
  nama_lokasi: string;
}

export interface Kelas {
  id_kelas: string;
  nama_kelas: string;
}

// Alias for app compatibility, using the Schema structure
export type User = Pengguna;

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  imageUrl?: string; // Support for image uploads
}

// Form System Interfaces
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'datetime-local' | 'select' | 'date' | 'dropdown' | 'creatable-select';
  options?: string[];
  placeholder?: string;
  required?: boolean;
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
  formId?: string; // Optional: Link to a FormTemplate
}


export interface RoleConfig {
  id: UserRole;
  label: string;
  icon: React.FC<any>;
  color: string; // Tailwind color class prefix (e.g., 'blue', 'green')
  description: string;
  transformativeValue: string;
  actions: QuickAction[];
}

export interface ChatInterfaceProps {
  user: User;
  roleConfig: RoleConfig;
  onDataSaved: (data: SavedData) => void;
  stats: any;
  isOpen: boolean; // For in-place collapsible chat state
  onToggle: () => void; // Function to toggle the state
  externalMessage?: string | null; // NEW: Allow external components to trigger chat
  onClearExternalMessage?: () => void; // NEW: Clear trigger after sending
}


// --- Card Data Types ---
export interface PaginationInfo {
  page: number;
  total_pages: number;
}

export interface HistorySection {
  items: any[];
  pagination?: PaginationInfo;
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
    langkah_penanganan: { urutan: number; tindakan: string; detail: string }[];
    tips_terbaik: { ikon: string; teks: string }[];
    analisis_solusi: { kelebihan: string[]; kekurangan: string[] };
}

export interface MaintenanceGuide {
    type: 'maintenance_guide';
    judul: string;
    perawatan_rutin: { periode: string; tindakan: string }[];
    tips_pencegahan: string[];
    indikasi_masalah: string[];
}

export interface WorkReportDraft {
    type: 'work_report_draft';
    id_tiket: string;
    nama_barang: string;
    deskripsi_masalah: string;
    langkah_penanganan: string;
    best_practices: string;
    common_pitfalls: string;
    pros_cons_approaches: string;
}

export interface LaporanStatus {
    type: 'laporan_status';
    id_laporan: string;
    deskripsi_laporan: string;
    status_laporan: string;
    catatan_status: string;
    tanggal_update: string;
}


// For real-time updates and database operations
export type TableName = 'pengaduan_kerusakan' | 'peminjaman_antrian' | 'pengguna' | 'inventaris' | 'lokasi' | 'agenda_kegiatan';

export interface SavedData {
    table: TableName;
    payload: any;
}

export interface GeminiResponse {
    text: string;
    dataToSave?: SavedData;
}
