import { GoogleGenAI } from "@google/genai";
import { User, GeminiResponse, PengaduanKerusakan, SavedData, LaporanStatus, TableName, TroubleshootingGuide, DetailedItemReport, Inventaris, PeminjamanAntrian } from "../types";
import db from './dbService';

// Use process.env.API_KEY as per guidelines
const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
try {
  if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
} catch (error) {
  console.error("Failed to initialize Gemini client", error);
}

const generateReportId = (user: User) => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const role = user.peran === 'tamu' ? 'TAMU' : user.peran.substring(0, 4).toUpperCase();
    return `SKL-${role}-${year}${month}${day}-${random}`;
}

// --- INTELLIGENT SIMULATION ENGINE ---
const runSimulation = (message: string, user: User): GeminiResponse | null => {
    const lowerMsg = message.toLowerCase();

    // CRITICAL FIX: BYPASS SIMULATION FOR ANALYSIS REQUESTS *ONLY IF AI IS AVAILABLE*
    // If AI is NOT available (missing API Key), we skip this bypass so the fallback simulation logic below can handle it.
    if (ai && lowerMsg.match(/(kesimpulan|analisis|rangkuman|kinerja|strategis|rekomendasi)/)) {
        return null; 
    }
    
    // CRITICAL FIX: BYPASS SIMULATION FOR CONTACT REQUESTS
    // Biarkan AI menangani permintaan kontak agar bisa membaca data injeksi
    if (ai && lowerMsg.match(/(kontak|hubungi|telepon|email|admin|petugas)/)) {
        return null;
    }
    
    // RULE 0: Handle Update Status (Explicit Command from Buttons)
    // Regex: "Perbarui status laporan [ID] menjadi [Status]"
    const updateStatusRegex = /(?:perbarui|ubah|ganti)\s+status\s+(?:laporan\s+)?([A-Z0-9-]+)\s+menjadi\s+(\w+)/i;
    const updateMatch = lowerMsg.match(updateStatusRegex);
    
    if (updateMatch && updateMatch[1] && updateMatch[2]) {
        // --- SECURITY CHECK (RBAC) ---
        // Hanya Penanggung Jawab dan Admin yang boleh mengubah status (Eksekusi)
        // Pengawas hanya boleh melihat (Monitoring)
        const allowedRoles = ['penanggung_jawab', 'admin'];
        if (!allowedRoles.includes(user.peran)) {
            return { 
                text: `⛔ *Akses Ditolak*\n\nMaaf, peran Anda sebagai **${user.peran.replace('_', ' ').toUpperCase()}** hanya memiliki akses pengawasan (monitoring).\n\nAnda tidak memiliki izin untuk mengubah status laporan. Silakan hubungi **Penanggung Jawab** untuk melakukan eksekusi perbaikan.` 
            };
        }

        const reportId = updateMatch[1].trim();
        const newStatusRaw = updateMatch[2].trim();
        
        // Normalize status to match type definition
        let newStatus: 'Pending' | 'Proses' | 'Selesai' | null = null;
        if (newStatusRaw.match(/proses|diproses/i)) newStatus = 'Proses';
        else if (newStatusRaw.match(/selesai|beres|tuntas/i)) newStatus = 'Selesai';
        else if (newStatusRaw.match(/pending|tunda/i)) newStatus = 'Pending';
        
        if (newStatus) {
            const reports = db.getTable('pengaduan_kerusakan');
            const reportIndex = reports.findIndex(r => r.id.toUpperCase() === reportId.toUpperCase());
            
            if (reportIndex !== -1) {
                const updatedReport = { ...reports[reportIndex], status: newStatus };
                
                // Construct SavedData payload
                const dataToSave: SavedData = {
                    table: 'pengaduan_kerusakan',
                    payload: updatedReport
                };
                
                return {
                    text: `✅ *Status Diperbarui*\n\nStatus laporan *${reportId}* berhasil diubah menjadi **${newStatus}**.\nSistem telah memperbarui database dan menotifikasi pelapor.`,
                    dataToSave
                };
            } else {
                return { text: `❌ *Gagal Update*\nLaporan dengan ID *${reportId}* tidak ditemukan.` };
            }
        }
    }

    // RULE 0.1: Handle General "Update Status" Request (e.g. from Quick Action Button)
    // When user says "Saya ingin update status..." without specific details.
    if (lowerMsg.includes('ingin update status') || lowerMsg.includes('ingin mengubah status')) {
        // Security check for general intent as well
        const allowedRoles = ['penanggung_jawab', 'admin'];
        if (!allowedRoles.includes(user.peran)) {
             return { 
                text: `⛔ *Menu Terbatas*\n\nFitur pembaruan status hanya tersedia untuk **Penanggung Jawab**. Sebagai Pengawas, Anda dapat menanyakan status terkini kepada saya.` 
            };
        }

        const reports = db.getTable('pengaduan_kerusakan');
        // Prioritaskan yang belum selesai (Pending atau Proses)
        const activeReports = reports.filter(r => r.status !== 'Selesai').sort((a,b) => b.tanggal_lapor.getTime() - a.tanggal_lapor.getTime());
        
        if (activeReports.length === 0) {
            return { text: "Saat ini tidak ada laporan aktif yang memerlukan pembaruan status (semua sudah Selesai)." };
        }

        const reportList = activeReports.slice(0, 5).map(r => 
            `- **${r.id}**: ${r.nama_barang} (Status Saat Ini: ${r.status})`
        ).join('\n');

        const exampleId = activeReports[0].id;

        return {
            text: `Untuk memperbarui status, Anda perlu menyebutkan ID laporan dan status tujuannya.\n\nSilakan ketik perintah dengan format berikut:\n👉 "**Perbarui status laporan ${exampleId} menjadi Proses**"\n👉 "**Perbarui status laporan ${exampleId} menjadi Selesai**"\n\nBerikut daftar laporan aktif yang bisa Anda update:\n${reportList}`
        };
    }

    // RULE 1: Handle Report Creation from free text (Tamu only or simplified reporting)
    if (user.peran === 'tamu' && (lowerMsg.includes('sampah') || lowerMsg.includes('kacau') || lowerMsg.includes('rusak') || lowerMsg.includes('berserakan'))) {
        const newReportId = generateReportId(user);
        const newReport: PengaduanKerusakan = {
            id: newReportId,
            id_barang: 'UMUM-01',
            id_pengadu: user.id_pengguna,
            tanggal_lapor: new Date(),
            deskripsi_masalah: message,
            status: 'Pending',
            kategori_aset: 'General',
            nama_barang: 'Masalah Kebersihan/Umum',
            nama_pengadu: user.nama_lengkap,
            lokasi_kerusakan: 'Berbagai Lokasi (dilaporkan oleh pengguna)'
        };
        const dataToSave: SavedData = { table: 'pengaduan_kerusakan', payload: newReport };
        return {
            text: `✅ *Laporan Diterima!*\n\nTerima kasih, laporan Anda telah kami catat. Tim terkait akan segera menindaklanjuti.\n\n*ID Laporan Anda: ${newReportId}*\n\nAnda dapat menggunakan ID ini untuk mengecek status laporan.`,
            dataToSave
        };
    }
    
    // RULE 2: Handle "Cek Status Laporan" from form/text
    const statusCheckRegex = /(?:cek status|lacak laporan|status untuk)\s+(?:id\s+)?([A-Z0-9-]+)/i;
    let match = lowerMsg.match(statusCheckRegex);
    
    if (!match && lowerMsg.startsWith('cek status untuk id laporan:')) {
         const idFromForm = message.split(':')[1]?.trim();
         match = [idFromForm, idFromForm];
    }

    if (match && match[1]) {
        const reportId = match[1].trim();
        if (reportId.length < 3) return null;

        const reports = db.getTable('pengaduan_kerusakan');
        const foundReport = reports.find(r => r.id.toUpperCase() === reportId.toUpperCase());
        
        if (foundReport) {
            const statusReport: LaporanStatus = {
                type: 'laporan_status',
                id_laporan: foundReport.id,
                deskripsi_laporan: foundReport.deskripsi_masalah,
                status_laporan: foundReport.status,
                catatan_status: foundReport.status === "Pending"
                    ? "Laporan telah diterima dan sedang menunggu verifikasi dari tim administrasi."
                    : `Laporan sedang ditangani. Status terakhir: ${foundReport.status}.`,
                tanggal_update: new Date(foundReport.tanggal_lapor).toLocaleString('id-ID')
            };
            return { text: `Baik, *${user.nama_lengkap}*. Berikut status terbaru untuk laporan *${reportId}*:\n:::DATA_JSON:::${JSON.stringify(statusReport)}` };
        } else {
            return { text: `Maaf, laporan dengan ID *${reportId}* tidak dapat ditemukan di database kami. Pastikan ID yang Anda masukkan benar.` };
        }
    }

    // RULE 3: Handle "Tampilkan riwayat dan detail teknis"
    const detailRegex = /tampilkan riwayat dan detail teknis untuk id\s+([A-Z0-9-]+)/i;
    match = lowerMsg.match(detailRegex);
    if(match && match[1]) {
        const itemId = match[1].toUpperCase();
        const inventaris = db.getTable('inventaris');
        const item = inventaris.find(i => i.id_barang.toUpperCase() === itemId);

        if (item) {
             const report: DetailedItemReport = {
                type: 'detailed_item_report',
                id_inventaris: item.id_barang,
                nama_barang: item.nama_barang,
                status_barang: item.status_barang,
                riwayat_kerusakan: {
                    items: db.getTable('pengaduan_kerusakan').filter(r => r.id_barang === item.id_barang)
                },
                catatan_teknis: { items: [{ tanggal: new Date().toLocaleDateString(), deskripsi: 'Pengecekan rutin dilakukan.' }] },
                riwayat_peminjaman: { items: db.getTable('peminjaman_antrian').filter(p => p.id_barang === item.id_barang) }
            };
            return { text: `Berikut adalah detail komprehensif untuk *${item.nama_barang}* (ID: ${item.id_barang}):\n:::DATA_JSON:::${JSON.stringify(report)}` };
        } else {
             return { text: `Maaf, aset dengan ID *${itemId}* tidak ditemukan di database inventaris.` };
        }
    }
    
    // RULE 4 (NEW): Handle Inventory Search (Simulation fallback for "Cek inventaris", "Status Server")
    if (lowerMsg.match(/(cek|cari|lihat|tampilkan|status|info)\s+.*(inventaris|aset|barang|server|jaringan|wifi|komputer|laptop|proyektor)/i) || lowerMsg.includes('inventaris kategori')) {
        const inventaris = db.getTable('inventaris');
        const locations = db.getTable('lokasi');
        let filtered = inventaris;
        
        if (lowerMsg.includes('server')) filtered = filtered.filter(i => i.nama_barang.toLowerCase().includes('server'));
        else if (lowerMsg.match(/(jaringan|wifi)/)) filtered = filtered.filter(i => i.nama_barang.toLowerCase().match(/(wifi|jaringan|router|access point)/));
        else if (lowerMsg.includes('it')) filtered = filtered.filter(i => i.kategori === 'IT');
        else if (lowerMsg.includes('sarpras')) filtered = filtered.filter(i => i.kategori === 'Sarpras');
        
        if (filtered.length === 0 && !lowerMsg.match(/(server|jaringan|wifi)/)) {
             // Return top 5 if no specific filter but intent is inventory
             filtered = inventaris.slice(0, 5);
        }

        if (filtered.length > 0) {
            const list = filtered.slice(0, 5).map(i => {
                const locName = locations.find(l => l.id_lokasi === i.id_lokasi)?.nama_lokasi || i.id_lokasi;
                return `- **${i.nama_barang}** (${i.kategori}): Status *${i.status_barang}* @ ${locName}`;
            }).join('\n');
            return { text: `📂 **Hasil Pencarian Inventaris (Simulasi):**\n\n${list}\n\n_(Menampilkan maks. 5 data)_` };
        }
        return { text: "Data inventaris tidak ditemukan untuk kriteria tersebut." };
    }
    
    // RULE 5 (NEW): Handle Basic Analysis (Simulation fallback)
    if (lowerMsg.match(/(analisis|kesimpulan|rangkuman|statistik)/) && lowerMsg.match(/(kerusakan|log|laporan)/)) {
        const reports = db.getTable('pengaduan_kerusakan');
        const total = reports.length;
        const itCount = reports.filter(r => r.kategori_aset === 'IT').length;
        const pendingCount = reports.filter(r => r.status === 'Pending').length;
        
        return {
            text: `📊 **Analisis Kerusakan (Mode Offline)**\n\nBerdasarkan data database saat ini:\n\n- **Total Laporan:** ${total}\n- **Kategori IT:** ${itCount}\n- **Status Pending:** ${pendingCount}\n\n*Catatan: Analisis mendalam memerlukan konfigurasi API Key.*`
        };
    }

    return null;
}


export const sendMessageToGemini = async (message: string, user: User, imageBase64?: string | null, mimeType?: string | null): Promise<GeminiResponse> => {
 
  // 1. Coba jalankan simulasi dulu (untuk respon cepat/tugas sederhana/fallback)
  const simulationResult = runSimulation(message, user);
  if (simulationResult) {
    return new Promise(resolve => setTimeout(() => resolve(simulationResult), 500));
  }

  // 2. Jika tidak tertangani simulasi, kirim ke Real AI
  if (!ai) {
    return { text: `⚠️ **Konfigurasi Diperlukan**\n\nFitur ini memerlukan **Google Gemini API Key**.\n\nSaat ini sistem berjalan dalam mode demo terbatas. Saya hanya dapat menjawab pertanyaan terkait data yang tersimpan di database (Simulasi), seperti cek status laporan, pencarian inventaris sederhana, atau rekap statistik dasar.\n\n_Pesan error debug: API Key belum dikonfigurasi (process.env.API_KEY)._`};
  }
  
  try {
    let systemInstruction = `Anda adalah asisten AI untuk sistem SIKILAT (Sistem Informasi Kilat & Manajemen Aset). 
    Peran pengguna saat ini: ${user.peran} (${user.nama_lengkap}).
    Jawablah dengan profesional, ringkas, dan membantu. Gunakan format Markdown.`;

    let userPrompt = message;
    let modelName = 'gemini-2.5-flash';
    let generationConfig: any = { systemInstruction };
    
    // --- CONTEXT INJECTION: ANALISIS ---
    if (message.toLowerCase().match(/(kesimpulan|analisis|rangkuman|kinerja|strategis|rekomendasi)/)) {
        const inventaris = db.getTable('inventaris');
        const reports = db.getTable('pengaduan_kerusakan');
        const bookings = db.getTable('peminjaman_antrian');
        
        const totalAset = inventaris.length;
        const asetRusakBerat = inventaris.filter(i => i.status_barang === 'Rusak Berat').length;
        const asetRusakRingan = inventaris.filter(i => i.status_barang === 'Rusak Ringan').length;
        const asetBaik = inventaris.filter(i => i.status_barang === 'Baik').length;
        
        const laporanPending = reports.filter(r => r.status === 'Pending').length;
        const laporanProses = reports.filter(r => r.status === 'Proses').length;
        const laporanSelesai = reports.filter(r => r.status === 'Selesai').length;
        
        const recentReports = reports
            .slice(0, 5)
            .map(r => `- [${r.tanggal_lapor.toLocaleDateString()}] ${r.nama_barang} di ${r.lokasi_kerusakan}: ${r.deskripsi_masalah} (Status: ${r.status})`)
            .join('\n');

        const contextData = `
        [DATA STATISTIK SISTEM REAL-TIME]
        - Total Aset: ${totalAset} (Baik: ${asetBaik}, Rusak: ${asetRusakRingan + asetRusakBerat})
        - Tiket Pending: ${laporanPending}, Proses: ${laporanProses}, Selesai: ${laporanSelesai}
        - Total Peminjaman: ${bookings.length}
        - Laporan Terakhir:
        ${recentReports}
        
        Instruksi: Berikan analisis manajerial dan rekomendasi strategis mengenai kesimpulan kinerja penanganan laporan dan kondisi aset saat ini berdasarkan data di atas.`;
        
        userPrompt = `${userPrompt}\n\n${contextData}`;

        // USE THINKING MODEL FOR COMPLEX ANALYSIS
        modelName = 'gemini-3-pro-preview';
        generationConfig = {
            systemInstruction,
            thinkingConfig: { thinkingBudget: 32768 } // Max budget for deep reasoning
        };
    }

    // --- CONTEXT INJECTION: KONTAK ADMIN/PETUGAS ---
    // Jika user minta kontak, kita ambil data pengguna (role admin/pengawas) dari DB dan suntikkan ke prompt.
    if (message.toLowerCase().match(/(kontak|hubungi|telepon|email|admin|petugas)/)) {
        const allUsers = db.getTable('pengguna');
        // Filter hanya menampilkan kontak petugas penting, bukan user biasa
        const officialContacts = allUsers.filter(u => 
            ['admin', 'pengawas_admin', 'pengawas_it', 'pengawas_sarpras', 'penanggung_jawab'].includes(u.peran)
        );

        const contactList = officialContacts.map(u => 
            `- ${u.nama_lengkap} (${u.peran.replace('_', ' ').toUpperCase()}): ${u.no_hp} | ${u.email}`
        ).join('\n');

        const contactContext = `
        [DATA KONTAK PETUGAS RESMI SIKILAT]
        Berikut adalah daftar kontak petugas yang BISA diberikan kepada pengguna jika diminta:
        ${contactList}

        Instruksi: User meminta kontak. Berikan informasi kontak di atas dengan format yang rapi dan mudah dibaca. JANGAN menolak memberikan informasi ini karena ini adalah data publik layanan.
        `;

        userPrompt = `${userPrompt}\n\n${contactContext}`;
    }

    let parts: any[] = [{ text: userPrompt }];

    if (imageBase64 && mimeType) {
        parts.push({
            inlineData: {
                data: imageBase64,
                mimeType: mimeType
            }
        });
    }

    const response = await ai.models.generateContent({
        model: modelName,
        config: generationConfig,
        contents: [{ parts: parts }],
    });
    
    return { text: response.text || "Maaf, saya tidak dapat memproses permintaan saat ini." };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "⚠️ *Gagal Terhubung ke AI*\nMaaf, terjadi gangguan koneksi. Pastikan API Key valid dan koneksi internet stabil." };
  }
};
