
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
  PieChart
} from 'lucide-react';
import { RoleConfig, User, FormTemplate, PengaduanKerusakan, Lokasi, Inventaris, PeminjamanAntrian } from './types';

export const MOCK_USERS: Record<string, User> = {
  guru: { 
    id_pengguna: 'u1', 
    nama_lengkap: 'Budi Santoso', 
    email: 'budi@sikilat.sch.id', 
    no_hp: '081234567890',
    peran: 'guru', 
    avatar: 'https://picsum.photos/seed/guru/100/100' 
  },
  pj: { 
    id_pengguna: 'u2', 
    nama_lengkap: 'Siti Aminah', 
    email: 'siti@sikilat.sch.id',
    no_hp: '081234567891',
    peran: 'penanggung_jawab', 
    avatar: 'https://picsum.photos/seed/pj/100/100' 
  },
  it: { 
    id_pengguna: 'u3', 
    nama_lengkap: 'Rudi Hartono', 
    email: 'rudi@sikilat.sch.id',
    no_hp: '081234567892',
    peran: 'pengawas_it', 
    avatar: 'https://picsum.photos/seed/it/100/100' 
  },
  sarpras: { 
    id_pengguna: 'u4', 
    nama_lengkap: 'Dewi Sartika', 
    email: 'dewi@sikilat.sch.id',
    no_hp: '081234567893',
    peran: 'pengawas_sarpras', 
    avatar: 'https://picsum.photos/seed/sarp/100/100' 
  },
  admin_p: { 
    id_pengguna: 'u5', 
    nama_lengkap: 'Ahmad Dahlan', 
    email: 'ahmad@sikilat.sch.id',
    no_hp: '081234567894',
    peran: 'pengawas_admin', 
    avatar: 'https://picsum.photos/seed/adm/100/100' 
  },
  admin: { 
    id_pengguna: 'u6', 
    nama_lengkap: 'Super Admin', 
    email: 'admin@sikilat.sch.id',
    no_hp: '081234567895',
    peran: 'admin', 
    avatar: 'https://picsum.photos/seed/super/100/100' 
  },
  tamu: { 
    id_pengguna: 'u7', 
    nama_lengkap: 'Pengunjung', 
    email: 'tamu@gmail.com',
    no_hp: '-',
    peran: 'tamu', 
    avatar: 'https://picsum.photos/seed/tamu/100/100' 
  },
};

export const SCHEMA_INFO = {
  tables: [
    { name: 'agenda_kegiatan', label: 'Agenda Kegiatan', count: 124 },
    { name: 'inventaris', label: 'Inventaris Aset', count: 5420 },
    { name: 'pengguna', label: 'Data Pengguna', count: 350 },
    { name: 'pengaduan_kerusakan', label: 'Pengaduan Kerusakan', count: 15 },
    { name: 'peminjaman_antrian', label: 'Peminjaman & Antrian', count: 42 },
    { name: 'lokasi', label: 'Lokasi Fisik', count: 28 },
    { name: 'kelas', label: 'Data Kelas', count: 32 },
  ]
};

// Mock Data for Damage Analysis Chart
const today = new Date();
const daysAgo = (days: number) => new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

export const MOCK_PENGADUAN_KERUSAKAN: PengaduanKerusakan[] = [
  { id: 'SKL-IT-241209-001', id_barang: 'inv01', id_pengadu: 'u1', tanggal_lapor: daysAgo(2), nama_barang: 'Keyboard PC', deskripsi_masalah: 'Tombol tidak berfungsi', status: 'Pending', kategori_aset: 'IT', nama_pengadu: 'Budi Santoso', lokasi_kerusakan: 'Lab Komputer 1' },
  { 
      id: 'SKL-SRP-241207-002', 
      id_barang: 'inv02', 
      id_pengadu: 'u1', 
      tanggal_lapor: daysAgo(4), 
      nama_barang: 'AC Ruang Kelas', 
      deskripsi_masalah: 'Tidak dingin', 
      status: 'Selesai', 
      kategori_aset: 'Sarpras', 
      nama_pengadu: 'Budi Santoso', 
      lokasi_kerusakan: 'Ruang Kelas 10A',
      diselesaikan_oleh: 'Siti Aminah (PJ)',
      catatan_penyelesaian: 'Freon telah diisi ulang dan filter dibersihkan.'
  },
  { id: 'SKL-IT-241206-003', id_barang: 'inv03', id_pengadu: 'u3', tanggal_lapor: daysAgo(5), nama_barang: 'Proyektor', deskripsi_masalah: 'Gambar buram', status: 'Proses', kategori_aset: 'IT', nama_pengadu: 'Rudi Hartono', lokasi_kerusakan: 'Ruang Guru' },
  { id: 'SKL-SRP-241204-004', id_barang: 'inv04', id_pengadu: 'u4', tanggal_lapor: daysAgo(7), nama_barang: 'Kursi Siswa', deskripsi_masalah: 'Kaki patah', status: 'Pending', kategori_aset: 'Sarpras', nama_pengadu: 'Dewi Sartika', lokasi_kerusakan: 'Ruang Kelas 10A' },
  { 
      id: 'SKL-IT-241203-005', 
      id_barang: 'inv01', 
      id_pengadu: 'u1', 
      tanggal_lapor: daysAgo(8), 
      nama_barang: 'Keyboard PC', 
      deskripsi_masalah: 'Koneksi terputus-putus', 
      status: 'Selesai', 
      kategori_aset: 'IT', 
      nama_pengadu: 'Budi Santoso', 
      lokasi_kerusakan: 'Lab Komputer 1',
      diselesaikan_oleh: 'Rudi Hartono (IT)',
      catatan_penyelesaian: 'Kabel USB diganti baru.'
  },
  { id: 'SKL-IT-241201-006', id_barang: 'inv05', id_pengadu: 'u1', tanggal_lapor: daysAgo(10), nama_barang: 'Mouse PC', deskripsi_masalah: 'Scroll tidak berfungsi', status: 'Pending', kategori_aset: 'IT', nama_pengadu: 'Budi Santoso', lokasi_kerusakan: 'Ruang Guru' },
  { id: 'SKL-SRP-241129-007', id_barang: 'inv02', id_pengadu: 'u4', tanggal_lapor: daysAgo(12), nama_barang: 'AC Ruang Guru', deskripsi_masalah: 'Bocor air', status: 'Proses', kategori_aset: 'Sarpras', nama_pengadu: 'Dewi Sartika', lokasi_kerusakan: 'Ruang Guru' },
  { id: 'SKL-GEN-241126-008', id_barang: 'inv06', id_pengadu: 'u1', tanggal_lapor: daysAgo(15), nama_barang: 'Papan Tulis Digital', deskripsi_masalah: 'Layar tidak merespon', status: 'Pending', kategori_aset: 'General', nama_pengadu: 'Budi Santoso', lokasi_kerusakan: 'Perpustakaan' },
  { id: 'SKL-IT-241121-009', id_barang: 'inv03', id_pengadu: 'u3', tanggal_lapor: daysAgo(20), nama_barang: 'Proyektor', deskripsi_masalah: 'Lampu mati', status: 'Selesai', kategori_aset: 'IT', nama_pengadu: 'Rudi Hartono', lokasi_kerusakan: 'Ruang Guru' },
  { id: 'SKL-IT-241119-010', id_barang: 'inv01', id_pengadu: 'u1', tanggal_lapor: daysAgo(22), nama_barang: 'Keyboard PC', deskripsi_masalah: 'Tombol lepas', status: 'Pending', kategori_aset: 'IT', nama_pengadu: 'Budi Santoso', lokasi_kerusakan: 'Lab Komputer 1' },
  { id: 'SKL-IT-241116-011', id_barang: 'inv07', id_pengadu: 'u1', tanggal_lapor: daysAgo(25), nama_barang: 'Jaringan WiFi', deskripsi_masalah: 'Koneksi lambat', status: 'Selesai', kategori_aset: 'IT', nama_pengadu: 'Budi Santoso', lokasi_kerusakan: 'Ruang Server' },
  { id: 'SKL-SRP-241113-012', id_barang: 'inv02', id_pengadu: 'u4', tanggal_lapor: daysAgo(28), nama_barang: 'AC Perpustakaan', deskripsi_masalah: 'Tidak dingin', status: 'Pending', kategori_aset: 'Sarpras', nama_pengadu: 'Dewi Sartika', lokasi_kerusakan: 'Perpustakaan' },
  { id: 'SKL-IT-241101-013', id_barang: 'inv40', id_pengadu: 'u1', tanggal_lapor: daysAgo(40), nama_barang: 'Printer', deskripsi_masalah: 'Kertas macet', status: 'Selesai', kategori_aset: 'IT', nama_pengadu: 'Budi Santoso', lokasi_kerusakan: 'Ruang Guru' }, 
  { id: 'SKL-SRP-241022-014', id_barang: 'inv50', id_pengadu: 'u4', tanggal_lapor: daysAgo(50), nama_barang: 'Meja Guru', deskripsi_masalah: 'Laci rusak', status: 'Selesai', kategori_aset: 'Sarpras', nama_pengadu: 'Dewi Sartika', lokasi_kerusakan: 'Ruang Guru' }, 
];

export const MOCK_PEMINJAMAN_ANTRIAN: PeminjamanAntrian[] = [
  { id_peminjaman: 'pm01', id_barang: 'inv02', nama_barang: 'Proyektor Epson', id_pengguna: 'u1', tanggal_peminjaman: daysAgo(1), jam_mulai: '13:00', jam_selesai: '15:00', keperluan: 'Presentasi kelas', tanggal_pengembalian_rencana: daysAgo(-1), status_peminjaman: 'Disetujui' },
  { id_peminjaman: 'pm02', id_barang: 'L02', nama_barang: 'Lab Komputer 1', id_pengguna: 'u1', tanggal_peminjaman: daysAgo(3), jam_mulai: '08:00', jam_selesai: '10:00', keperluan: 'Ujian Praktik TIK', tanggal_pengembalian_rencana: daysAgo(-4), status_peminjaman: 'Menunggu' },
  { id_peminjaman: 'pm03', id_barang: 'inv01', nama_barang: 'PC Desktop', id_pengguna: 'u3', tanggal_peminjaman: daysAgo(5), jam_mulai: '10:00', jam_selesai: '11:00', keperluan: 'Update software', tanggal_pengembalian_rencana: daysAgo(-6), status_peminjaman: 'Kembali' },
  { id_peminjaman: 'pm04', id_barang: 'L03', nama_barang: 'Perpustakaan', id_pengguna: 'u1', tanggal_peminjaman: daysAgo(8), jam_mulai: '09:00', jam_selesai: '11:00', keperluan: 'Kegiatan literasi', tanggal_pengembalian_rencana: daysAgo(-9), status_peminjaman: 'Ditolak', alasan_penolakan: 'Ruangan sudah dibooking untuk kegiatan lain.' },
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
    { id_barang: 'inv04', nama_barang: 'Meja Siswa', kategori: 'Sarpras', status_barang: 'Rusak Berat', id_lokasi: 'L01' },
    { id_barang: 'inv05', nama_barang: 'Printer HP LaserJet', kategori: 'IT', status_barang: 'Perbaikan', id_lokasi: 'L04' },
    { id_barang: 'inv06', nama_barang: 'Rak Buku', kategori: 'Sarpras', status_barang: 'Rusak Ringan', id_lokasi: 'L03' },
];


// Form Templates Definition
export const FORM_TEMPLATES: Record<string, FormTemplate> = {
  agenda_kegiatan: {
    id: 'agenda_kegiatan',
    title: 'Input Agenda Kegiatan',
    submitLabel: 'Simpan Kegiatan',
    fields: [
      { name: 'waktu_mulai', label: 'Waktu Mulai', type: 'datetime-local', required: true },
      { name: 'waktu_selesai', label: 'Waktu Selesai', type: 'datetime-local', required: true },
      { name: 'posisi', label: 'Posisi / Lokasi', type: 'text', placeholder: 'Contoh: Lab Komputer 1', required: true },
      { name: 'objek_pengguna', label: 'Objek Pengguna', type: 'text', placeholder: 'Contoh: Siswa Kelas 8A / Guru', required: true },
      { name: 'uraian_kegiatan', label: 'Uraian Kegiatan', type: 'textarea', placeholder: 'Jelaskan detail aktivitas yang dilakukan...', required: true },
      { name: 'hasil_kegiatan', label: 'Hasil Kegiatan', type: 'textarea', placeholder: 'Hasil atau status akhir kegiatan...', required: true },
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
  booking_ruangan: {
    id: 'booking_ruangan',
    title: 'Booking Ruangan / Alat',
    submitLabel: 'Ajukan Booking',
    fields: [
      { name: 'objek', label: 'Ruangan / Alat', type: 'text', placeholder: 'Contoh: Aula Utama', required: true },
      { name: 'tanggal', label: 'Tanggal Peminjaman', type: 'date', required: true },
      { name: 'jam_mulai', label: 'Jam Mulai', type: 'text', placeholder: '08:00', required: true },
      { name: 'jam_selesai', label: 'Jam Selesai', type: 'text', placeholder: '10:00', required: true },
      { name: 'keperluan', label: 'Keperluan', type: 'textarea', placeholder: 'Untuk kegiatan apa?', required: true },
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
    description: 'Pelaporan & Peminjaman (pengaduan_kerusakan, peminjaman_antrian)',
    transformativeValue: 'Efisiensi Waktu Signifikan: Melaporkan kerusakan atau meminjam alat tanpa birokrasi formulir manual.',
    actions: [
      { label: 'Lapor Kerusakan', prompt: 'Saya ingin melaporkan kerusakan aset.', icon: AlertCircle, formId: 'lapor_kerusakan' },
      { label: 'Booking Ruangan', prompt: 'Saya ingin melakukan booking ruangan.', icon: Calendar, formId: 'booking_ruangan' },
      { label: 'Cek Antrian', prompt: 'Tampilkan data dari tabel peminjaman_antrian.', icon: Clock },
      { label: 'Tanya Inventaris', prompt: 'Cek status barang di tabel inventaris.', icon: Search },
    ]
  },
  penanggung_jawab: {
    id: 'penanggung_jawab',
    label: 'Penanggung Jawab',
    icon: Wrench,
    color: 'emerald',
    description: 'Kegiatan & Perbaikan (agenda_kegiatan, pengaduan_kerusakan)',
    transformativeValue: 'Fokus Perbaikan Terarah: Akses instan ke riwayat aset dan manajemen tiket perbaikan.',
    actions: [
      { label: 'Buat Kesimpulan', prompt: 'Buatkan analisis dan kesimpulan manajerial mengenai kinerja penanganan laporan dan kondisi aset saat ini berdasarkan data real-time.', icon: PieChart },
      { label: 'Input Kegiatan', prompt: 'Catat kegiatan penanganan hari ini.', icon: PenTool, formId: 'agenda_kegiatan' },
      { label: 'Update Status', prompt: 'Saya ingin update status di tabel pengaduan_kerusakan.', icon: Clock },
      { label: 'Tiket Pending', prompt: 'Query data status="Pending" dari tabel pengaduan_kerusakan.', icon: AlertCircle },
    ]
  },
  pengawas_it: {
    id: 'pengawas_it',
    label: 'Pengawas IT',
    icon: Monitor,
    color: 'violet',
    description: 'Monitoring Infrastruktur (inventaris, lokasi)',
    transformativeValue: 'Stabilitas Infrastruktur: Monitoring server dan analisis downtime proaktif.',
    actions: [
      { label: 'Status Server', prompt: 'Cek inventaris kategori "Server" & "Jaringan".', icon: Monitor },
      { label: 'Analisis Downtime', prompt: 'Analisis log kerusakan kategori IT bulan ini.', icon: BarChart2 },
      { label: 'Rekomendasi Upgrade', prompt: 'Query inventaris yang statusnya "Rusak Ringan".', icon: Database },
      { label: 'Laporan Keamanan', prompt: 'Cek log akses sistem.', icon: ShieldAlert },
    ]
  },
  pengawas_sarpras: {
    id: 'pengawas_sarpras',
    label: 'Pengawas Sarpras',
    icon: Building2,
    color: 'amber',
    description: 'Manajemen Aset (inventaris, lokasi, kelas)',
    transformativeValue: 'Keputusan Proaktif: Analisis kinerja aset untuk keputusan peremajaan sebelum rusak total.',
    actions: [
      { label: 'Analisis & Kesimpulan', prompt: 'Buatkan analisis strategis dan kesimpulan mengenai data inventaris dan kerusakan saat ini untuk peremajaan aset.', icon: BarChart2 },
      { label: 'Cek Aset Rusak', prompt: `Query inventaris kategori "Sarpras" yang statusnya "Rusak Ringan" atau "Rusak Berat".`, icon: Search },
      { label: 'Rekomendasi Peremajaan', prompt: 'List barang status "Rusak Berat" di tabel inventaris.', icon: CheckCircle },
      { label: 'Analisis Biaya', prompt: 'Estimasi biaya berdasarkan tabel pengaduan_kerusakan.', icon: PieChart },
      { label: 'Aset Kritis', prompt: 'Tampilkan aset vital di lokasi utama.', icon: ShieldAlert },
    ]
  },
  pengawas_admin: {
    id: 'pengawas_admin',
    label: 'Pengawas Admin',
    icon: FileText,
    color: 'indigo',
    description: 'Administrasi (pengguna, agenda_kegiatan)',
    transformativeValue: 'Transparansi Penuh: Audit trail lengkap dan laporan administrasi otomatis.',
    actions: [
      { label: 'Laporan Harian', prompt: 'Rekap tabel agenda_kegiatan hari ini.', icon: FileText },
      { label: 'Audit User', prompt: 'Cek aktivitas tabel pengguna baru.', icon: Search },
      { label: 'Statistik Penggunaan', prompt: 'Hitung frekuensi peminjaman_antrian per kelas.', icon: BarChart2 },
      { label: 'Cek Dokumen', prompt: 'Verifikasi kelengkapan data inventaris baru.', icon: CheckCircle },
    ]
  },
  admin: {
    id: 'admin',
    label: 'Administrator',
    icon: Settings,
    color: 'rose',
    description: 'Full Access (Semua Tabel)',
    transformativeValue: 'Kontrol Sistem: Manajemen user, backup data, dan konfigurasi global.',
    actions: [
      { label: 'Manajemen User', prompt: 'Kelola data di tabel pengguna.', icon: Users },
      { label: 'Backup DB', prompt: 'Backup semua tabel ke Canva Sheet Archive.', icon: Database },
      { label: 'Konfigurasi', prompt: 'Atur ulang parameter sistem.', icon: Settings },
      { label: 'Log Error', prompt: 'Tampilkan error log sistem.', icon: ShieldAlert },
    ]
  },
  tamu: {
    id: 'tamu',
    label: 'Tamu / Ortu',
    icon: UserCircle,
    color: 'cyan',
    description: 'Informasi Publik (lokasi, fasilitas)',
    transformativeValue: 'Layanan 24/7: Informasi cepat dan stabil meningkatkan citra sekolah yang responsif.',
    actions: [
      { label: 'Info Fasilitas', prompt: 'Info fasilitas dari tabel lokasi dan inventaris umum.', icon: Building2 },
      { label: 'Jam Operasional', prompt: 'Kapan jam operasional layanan?', icon: Clock },
      { label: 'Kontak Admin', prompt: 'Minta kontak dari tabel pengguna (role admin).', icon: UserCircle },
      { label: 'Cek Status Laporan', prompt: 'Cek status laporan kerusakan yang sudah dibuat.', icon: FileSearch, formId: 'cek_laporan' },
    ]
  }
};
