
import { 
  Users, 
  Wrench, 
  Monitor, 
  Building2, 
  FileText, 
  Settings, 
  UserCircle,
  AlertCircle,
  Calendar,
  Search,
  CheckCircle,
  Clock,
  BarChart2,
  ShieldAlert,
  Database,
  Info,
  PenTool,
  FileSearch,
  PieChart,
  Star,
  ShieldCheck,
  ClipboardList,
  Sparkles,
  CalendarCheck
} from 'lucide-react';
import { RoleConfig, User, FormTemplate, PengaduanKerusakan, Lokasi, Inventaris, PeminjamanAntrian, AgendaKegiatan, PenilaianAset } from './types';

export const MOCK_USERS: Record<string, User> = {
  guru: { id_pengguna: 'u1', nama_lengkap: 'Budi Santoso', email: 'budi@sikilat.sch.id', no_hp: '081234567890', peran: 'guru', avatar: 'https://picsum.photos/seed/guru/100/100' },
  pj: { id_pengguna: 'u2', nama_lengkap: 'Siti Aminah', email: 'siti@sikilat.sch.id', no_hp: '081234567891', peran: 'penanggung_jawab', avatar: 'https://picsum.photos/seed/pj/100/100' },
  it: { id_pengguna: 'u3', nama_lengkap: 'Rudi Hartono', email: 'rudi@sikilat.sch.id', no_hp: '081234567892', peran: 'pengawas_it', avatar: 'https://picsum.photos/seed/it/100/100' },
  sarpras: { id_pengguna: 'u4', nama_lengkap: 'Dewi Sartika', email: 'dewi@sikilat.sch.id', no_hp: '081234567893', peran: 'pengawas_sarpras', avatar: 'https://picsum.photos/seed/sarp/100/100' },
  admin_p: { id_pengguna: 'u5', nama_lengkap: 'Ahmad Dahlan', email: 'ahmad@sikilat.sch.id', no_hp: '081234567894', peran: 'pengawas_admin', avatar: 'https://picsum.photos/seed/adm/100/100' },
  admin: { id_pengguna: 'u6', nama_lengkap: 'Super Admin', email: 'admin@sikilat.sch.id', no_hp: '081234567895', peran: 'admin', avatar: 'https://picsum.photos/seed/super/100/100' },
  tamu: { id_pengguna: 'u7', nama_lengkap: 'Pengunjung', email: 'tamu@gmail.com', no_hp: '-', peran: 'tamu', avatar: 'https://picsum.photos/seed/tamu/100/100' },
};

const today = new Date();
const daysAgo = (days: number) => new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

export const MOCK_PENILAIAN_ASET: PenilaianAset[] = [
    { id: 'EV-001', id_barang: 'inv01', nama_barang: 'PC Desktop', lokasi: 'Lab Komputer 1', id_pengguna: 'u7', nama_pengguna: 'Pengunjung', skor: 4, ulasan: 'Komputer cepat tapi keyboard agak berdebu.', tanggal: daysAgo(1), status_penanganan: 'Terbuka' },
    { id: 'EV-002', id_barang: 'inv02', nama_barang: 'Proyektor Epson', lokasi: 'Ruang Kelas 10A', id_pengguna: 'u7', nama_pengguna: 'Tamu 1', skor: 2, ulasan: 'Warna sudah mulai pudar, perlu kalibrasi.', tanggal: daysAgo(3), status_penanganan: 'Selesai', balasan_admin: 'Terima kasih informasinya, tim IT akan segera menjadwalkan kalibrasi minggu ini.', tanggal_balasan: daysAgo(2) },
    { id: 'EV-003', id_barang: 'inv03', nama_barang: 'AC Panasonic', lokasi: 'Ruang Guru', id_pengguna: 'u7', nama_pengguna: 'Pengunjung', skor: 5, ulasan: 'Sangat dingin dan nyaman.', tanggal: daysAgo(5), status_penanganan: 'Terbuka' }
];

export const MOCK_AGENDA_KEGIATAN: AgendaKegiatan[] = [
    { id: 'AGD-001', nama_pj: 'Siti Aminah', waktu_mulai: daysAgo(0).toISOString().replace(/T.*/, 'T08:00'), waktu_selesai: daysAgo(0).toISOString().replace(/T.*/, 'T09:00'), posisi: 'Lab Komputer 1', objek_pengguna: 'Siswa Kelas 9A', uraian_kegiatan: 'Maintenance PC sebelum ujian.', hasil_kegiatan: '20 PC Siap.', status: 'Pending' },
];

export const MOCK_PENGADUAN_KERUSAKAN: PengaduanKerusakan[] = [
  { id: 'SKL-IT-241209-001', id_barang: 'inv01', id_pengadu: 'u1', tanggal_lapor: daysAgo(2), nama_barang: 'Keyboard PC', deskripsi_masalah: 'Tombol tidak berfungsi', status: 'Pending', kategori_aset: 'IT', nama_pengadu: 'Budi Santoso', lokasi_kerusakan: 'Lab Komputer 1' },
];

export const MOCK_PEMINJAMAN_ANTRIAN: PeminjamanAntrian[] = [
  { id_peminjaman: 'pm01', id_barang: 'inv02', nama_barang: 'Proyektor Epson', id_pengguna: 'u1', tanggal_peminjaman: daysAgo(1), jam_mulai: '13:00', jam_selesai: '15:00', keperluan: 'Presentasi kelas', tanggal_pengembalian_rencana: daysAgo(-1), status_peminjaman: 'Disetujui' },
];

export const MOCK_LOKASI: Lokasi[] = [
    { id_lokasi: 'L01', nama_lokasi: 'Ruang Kelas 10A' },
    { id_lokasi: 'L02', nama_lokasi: 'Lab Komputer 1' },
    { id_lokasi: 'L03', nama_lokasi: 'Perpustakaan' },
    { id_lokasi: 'L04', nama_lokasi: 'Ruang Guru' },
];

export const MOCK_INVENTARIS: Inventaris[] = [
    { id_barang: 'inv01', nama_barang: 'PC Desktop', kategori: 'IT', status_barang: 'Baik', id_lokasi: 'L02' },
    { id_barang: 'inv02', nama_barang: 'Proyektor Epson', kategori: 'IT', status_barang: 'Rusak Ringan', id_lokasi: 'L01' },
    { id_barang: 'inv03', nama_barang: 'AC Panasonic', kategori: 'Sarpras', status_barang: 'Baik', id_lokasi: 'L04' },
];

export const FORM_TEMPLATES: Record<string, FormTemplate> = {
  penilaian_aset: {
    id: 'penilaian_aset',
    title: 'Beri Penilaian Aset',
    submitLabel: 'Kirim Penilaian',
    fields: [
      { name: 'nama_barang', label: 'Nama Aset / Ruangan', type: 'text', placeholder: 'Contoh: Lab Komputer 1', required: true },
      { name: 'skor', label: 'Rating (1-5)', type: 'number', min: 1, max: 5, placeholder: '5', required: true },
      { name: 'ulasan', label: 'Ulasan / Masukan', type: 'textarea', placeholder: 'Apa pendapat Anda mengenai kondisi aset ini?', required: true },
    ]
  },
  booking_ruangan: {
    id: 'booking_ruangan',
    title: 'Formulir Booking Ruangan/Alat',
    submitLabel: 'Ajukan Booking',
    fields: [
      { name: 'nama_barang', label: 'Nama Ruangan / Alat', type: 'text', placeholder: 'Contoh: Lab Komputer 1', required: true },
      { name: 'tanggal', label: 'Tanggal Penggunaan', type: 'date', required: true },
      { name: 'jam_mulai', label: 'Jam Mulai', type: 'text', placeholder: '08:00', required: true },
      { name: 'jam_selesai', label: 'Jam Selesai', type: 'text', placeholder: '10:00', required: true },
      { name: 'keperluan', label: 'Keperluan Penggunaan', type: 'textarea', placeholder: 'Contoh: Ujian Praktik TIK Kelas 9', required: true },
    ]
  },
  input_kegiatan: {
    id: 'input_kegiatan',
    title: 'Formulir Input Kegiatan PJ',
    submitLabel: 'Simpan Agenda',
    fields: [
      { name: 'posisi', label: 'Lokasi Kegiatan', type: 'text', placeholder: 'Contoh: Lab Komputer 1', required: true },
      { name: 'uraian_kegiatan', label: 'Uraian Kegiatan', type: 'textarea', placeholder: 'Jelaskan apa yang dilakukan...', required: true },
      { name: 'hasil_kegiatan', label: 'Hasil / Output', type: 'text', placeholder: 'Contoh: 20 PC Selesai Maintenance', required: true },
      { name: 'objek_pengguna', label: 'Target Pengguna', type: 'text', placeholder: 'Contoh: Siswa Kelas 9A', required: true },
      { name: 'waktu_mulai', label: 'Waktu Mulai', type: 'datetime-local', required: true },
      { name: 'waktu_selesai', label: 'Waktu Selesai', type: 'datetime-local', required: true },
    ]
  },
  lapor_kerusakan: {
    id: 'lapor_kerusakan',
    title: 'Formulir Lapor Kerusakan',
    submitLabel: 'Kirim Laporan',
    fields: [
      { name: 'nama_barang', label: 'Nama Barang', type: 'text', placeholder: 'Contoh: Proyektor Epson', required: true },
      { name: 'lokasi', label: 'Lokasi', type: 'text', placeholder: 'Contoh: Ruang Kelas 9B', required: true },
      { name: 'deskripsi', label: 'Deskripsi Masalah', type: 'textarea', placeholder: 'Jelaskan kerusakan secara detail...', required: true },
      { name: 'urgensi', label: 'Tingkat Urgensi', type: 'select', options: ['Rendah', 'Sedang', 'Tinggi', 'Darurat'], required: true },
    ]
  },
  cek_laporan: {
    id: 'cek_laporan',
    title: 'Cek Status Laporan Anda',
    submitLabel: 'Cek Status',
    fields: [
      { name: 'id_laporan', label: 'Masukkan ID Laporan Anda', type: 'text', placeholder: 'Contoh: SKL-TAMU-240729-ABC', required: true },
    ]
  }
};

export const ROLE_CONFIGS: Record<string, RoleConfig> = {
  guru: {
    id: 'guru',
    label: 'Guru',
    icon: Users,
    color: 'blue',
    description: 'Pelaporan & Peminjaman',
    transformativeValue: 'Efisiensi Waktu Signifikan.',
    actions: [
      { label: 'Booking Ruangan', prompt: 'Saya ingin melakukan booking ruangan atau alat.', icon: CalendarCheck, formId: 'booking_ruangan' },
      { label: 'Lapor Kerusakan', prompt: 'Saya ingin melaporkan kerusakan aset.', icon: AlertCircle, formId: 'lapor_kerusakan' },
      { label: 'Tanya Inventaris', prompt: 'Cek status barang di tabel inventaris.', icon: Search },
    ]
  },
  penanggung_jawab: {
    id: 'penanggung_jawab',
    label: 'Penanggung Jawab',
    icon: Wrench,
    color: 'emerald',
    description: 'Kegiatan & Perbaikan',
    transformativeValue: 'Fokus Perbaikan Terarah.',
    actions: [
      { label: 'Cek Antrian Booking', prompt: 'Tampilkan semua data dari tabel peminjaman_antrian untuk direview.', icon: CalendarCheck },
      { label: 'Buat Kesimpulan AI', prompt: 'Buatkan analisis dan kesimpulan manajerial mengenai kinerja penanganan laporan, kondisi aset, dan sentimen penilaian pengguna saat ini.', icon: PieChart },
      { label: 'Input Kegiatan', prompt: 'Catat kegiatan penanganan hari ini.', icon: PenTool, formId: 'input_kegiatan' },
    ]
  },
  pengawas_it: {
    id: 'pengawas_it',
    label: 'Pengawas IT',
    icon: Monitor,
    color: 'violet',
    description: 'Monitoring Aset Digital',
    transformativeValue: 'Data Aset IT Real-time.',
    actions: [
      { label: 'Audit IT AI', prompt: 'Berikan analisis AI khusus untuk performa aset IT dan daftar perbaikan yang sedang berjalan.', icon: Sparkles },
      { label: 'Cek Inventaris IT', prompt: 'Tampilkan semua data IT dari tabel inventaris.', icon: Database },
    ]
  },
  pengawas_sarpras: {
    id: 'pengawas_sarpras',
    label: 'Pengawas Sarpras',
    icon: Building2,
    color: 'amber',
    description: 'Monitoring Fasilitas',
    transformativeValue: 'Fasilitas Terjaga Optimal.',
    actions: [
      { label: 'Analisis Fasilitas', prompt: 'Berikan rangkuman AI mengenai kondisi fasilitas fisik dan keluhan sarpras terbanyak.', icon: PieChart },
      { label: 'Jadwal Agenda', prompt: 'Tampilkan semua data dari tabel agenda_kegiatan.', icon: Calendar },
    ]
  },
  pengawas_admin: {
    id: 'pengawas_admin',
    label: 'Pengawas Admin',
    icon: ShieldCheck,
    color: 'indigo',
    description: 'Monitoring Manajemen',
    transformativeValue: 'Transparansi Administrasi.',
    actions: [
      { label: 'Kesimpulan Manajerial', prompt: 'Buatkan kesimpulan manajerial menyeluruh tentang produktivitas tim dan kepuasan pengguna.', icon: ClipboardList },
      { label: 'Audit Peminjaman', prompt: 'Tampilkan histori dari tabel peminjaman_antrian.', icon: CalendarCheck },
      { label: 'Log Aktivitas', prompt: 'Tampilkan histori kegiatan terbaru dari tabel agenda_kegiatan.', icon: FileText },
      { label: 'Audit Penilaian', prompt: 'Tampilkan semua data dari tabel penilaian_aset.', icon: Star },
    ]
  },
  admin: {
    id: 'admin',
    label: 'Administrator',
    icon: Settings,
    color: 'rose',
    description: 'Full Access & Control',
    transformativeValue: 'Kontrol Sistem Total.',
    actions: [
      { label: 'Manajemen Booking', prompt: 'Tampilkan semua data dari tabel peminjaman_antrian.', icon: CalendarCheck },
      { label: 'Audit Penilaian', prompt: 'Tampilkan semua data dari tabel penilaian_aset.', icon: Star },
      { label: 'Backup DB', prompt: 'Backup semua tabel.', icon: Database },
    ]
  },
  tamu: {
    id: 'tamu',
    label: 'Tamu / Ortu',
    icon: UserCircle,
    color: 'cyan',
    description: 'Informasi Publik',
    transformativeValue: 'Layanan 24/7.',
    actions: [
      { label: 'Beri Penilaian', prompt: 'Saya ingin memberi penilaian fasilitas sekolah.', icon: Star, formId: 'penilaian_aset' },
      { label: 'Cek Status Laporan', prompt: 'Cek status laporan kerusakan.', icon: FileSearch, formId: 'cek_laporan' },
      { label: 'Info Fasilitas', prompt: 'Info fasilitas dari tabel lokasi.', icon: Building2 },
    ]
  }
};
