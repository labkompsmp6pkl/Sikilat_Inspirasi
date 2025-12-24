
import { GoogleGenAI } from "@google/genai";
import { User, GeminiResponse, PengaduanKerusakan, SavedData, LaporanStatus, TableName, PenilaianAset, PeminjamanAntrian, AgendaKegiatan, Inventaris } from "../types";
import db from './dbService';

export const generateGlobalConclusion = async (data: {
    reports: PengaduanKerusakan[],
    bookings: PeminjamanAntrian[],
    activities: AgendaKegiatan[],
    inventaris: Inventaris[]
}, user: User): Promise<string> => {
    if (!process.env.API_KEY) return "Fitur AI memerlukan API Key aktif.";
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Enriched data context for deeper strategic analysis
    const context = `
    DATA STATUS OPERASIONAL SIKILAT:
    
    1. RINGKASAN INVENTARIS:
       - Total Aset: ${data.inventaris.length} item.
       - Kondisi: ${data.inventaris.filter(i => i.status_barang === 'Baik').length} Baik, 
                  ${data.inventaris.filter(i => i.status_barang !== 'Baik').length} Bermasalah/Perbaikan.
    
    2. LAPORAN KERUSAKAN TERBARU (PENDING):
       ${data.reports.filter(r => r.status === 'Pending').slice(0, 5).map(r => `- [${r.kategori_aset}] ${r.nama_barang} di ${r.lokasi_kerusakan}: ${r.deskripsi_masalah}`).join('\n')}
       - Total Tiket Menunggu: ${data.reports.filter(r => r.status === 'Pending').length}
    
    3. UTILISASI ASET (BOOKING AKTIF):
       ${data.bookings.filter(b => b.status_peminjaman === 'Disetujui').slice(0, 5).map(b => `- ${b.nama_barang} (${b.keperluan})`).join('\n')}
       - Total Antrian Aktif: ${data.bookings.filter(b => b.status_peminjaman === 'Menunggu').length}
    
    4. AKTIVITAS PETUGAS (AGENDA):
       ${data.activities.slice(0, 5).map(a => `- ${a.nama_pj}: ${a.uraian_kegiatan} [Status: ${a.status}]`).join('\n')}
    `;

    const systemInstruction = `Anda adalah SIKILAT AI - Chief Infrastructure Strategist.
    Tugas: Berikan "Executive Strategic Summary" (Kesimpulan Strategis Eksekutif) berdasarkan data operasional sekolah.
    Tone: Profesional, tajam, analitis, dan solutif.
    Bahasa: Indonesia.
    
    Struktur Output yang Wajib:
    1. 📊 **Overview Operasional**: (Ringkasan singkat kesehatan aset).
    2. ⚠️ **Titik Kritis & Urgensi**: (Identifikasi masalah paling mendesak).
    3. 💡 **Rekomendasi Manajerial**: (3 langkah konkret untuk optimasi).
    4. 📈 **Outlook**: (Prediksi tantangan minggu depan).
    
    Aturan: Gunakan Markdown yang elegan. Jangan terlalu teknis, fokus pada nilai manajerial. Maksimal 150 kata.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            config: { 
                systemInstruction,
                thinkingConfig: { thinkingBudget: 4000 } // Adding thinking budget for complex reasoning
            },
            contents: { parts: [{ text: `Analisis data operasional berikut dan buatkan kesimpulan strategis: ${context}` }] },
        });
        return response.text || "Gagal menghasilkan kesimpulan.";
    } catch (e) {
        console.error("Gemini Error:", e);
        return "Terjadi kesalahan saat menghubungi otak AI.";
    }
};

export const generateReplySuggestion = async (reviewText: string, user: User): Promise<string> => {
    if (!process.env.API_KEY) return "Terima kasih.";
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const isAdmin = ['admin', 'pengawas_admin'].includes(user.peran);
    const systemInstruction = isAdmin 
        ? "Anda adalah Admin SIKILAT. Balas ulasan tamu secara profesional, hangat, dan solutif (maks 20 kata)."
        : "Balas ulasan sebelumnya secara singkat dan sopan (maks 15 kata).";

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            config: { systemInstruction },
            contents: { parts: [{ text: `Ulasan Pengguna: "${reviewText}"` }] },
        });
        return response.text || "Terima kasih.";
    } catch (e) { return "Terima kasih atas masukannya."; }
};

const runSimulation = (message: string, user: User): GeminiResponse | null => {
    const cleanMessage = message.replace(/\[CONTEXT:[\s\S]*?\]\.\n\nUser's Reply:\s*/, "").trim();
    const lowerMsg = cleanMessage.toLowerCase();

    if (cleanMessage.includes('📝 Input Formulir: Formulir Input Kegiatan PJ')) {
        try {
            const parse = (label: string) => {
                const regex = new RegExp(`🔹 ${label}:\\s*(.*)`);
                const match = cleanMessage.match(regex);
                return match ? match[1].trim() : '';
            };
            const newAgenda: AgendaKegiatan = {
                id: `AGD-${Date.now()}`,
                nama_pj: user.nama_lengkap,
                waktu_mulai: parse('Waktu Mulai'),
                waktu_selesai: parse('Waktu Selesai'),
                posisi: parse('Lokasi Kegiatan'),
                uraian_kegiatan: parse('Uraian Kegiatan'),
                hasil_kegiatan: parse('Hasil / Output'),
                objek_pengguna: parse('Target Pengguna'),
                status: 'Pending'
            };
            return {
                text: `✅ **Kegiatan Berhasil Dicatat!**\n\nAgenda Anda di **${newAgenda.posisi}** telah disimpan dan sedang dalam antrian verifikasi pengawas.`,
                dataToSave: { table: 'agenda_kegiatan', payload: newAgenda }
            };
        } catch (e) { console.error(e) }
    }

    if (cleanMessage.includes('📝 Input Formulir: Formulir Booking Ruangan/Alat')) {
        try {
            const parse = (label: string) => {
                const regex = new RegExp(`🔹 ${label}:\\s*(.*)`);
                const match = cleanMessage.match(regex);
                return match ? match[1].trim() : '';
            };
            const newBooking: PeminjamanAntrian = {
                id_peminjaman: `pm-${Date.now()}`,
                id_barang: 'ASET-BOOKING',
                nama_barang: parse('Nama Ruangan / Alat'),
                id_pengguna: user.nama_lengkap,
                tanggal_peminjaman: new Date(parse('Tanggal Penggunaan')),
                jam_mulai: parse('Jam Mulai'),
                jam_selesai: parse('Jam Selesai'),
                keperluan: parse('Keperluan Penggunaan'),
                tanggal_pengembalian_rencana: new Date(parse('Tanggal Penggunaan')),
                status_peminjaman: 'Menunggu'
            };
            return {
                text: `✅ **Booking Berhasil Diajukan!**\n\nPengajuan untuk **${newBooking.nama_barang}** telah tersimpan di Cloud. Silakan cek menu 'Booking Table' secara berkala.`,
                dataToSave: { table: 'peminjaman_antrian', payload: newBooking }
            };
        } catch (e) { console.error(e) }
    }

    if (lowerMsg.includes('booking') || lowerMsg.includes('pinjam')) {
        return { text: `Silakan klik tombol di bawah untuk mengisi detail peminjaman aset:\n\n:::DATA_JSON:::{"type": "form_trigger", "formId": "booking_ruangan", "label": "Buka Formulir Booking"}` };
    }

    return null;
}

export const sendMessageToGemini = async (message: string, user: User, imageBase64?: string | null, mimeType?: string | null): Promise<GeminiResponse> => {
  const simulationResult = runSimulation(message, user);
  if (simulationResult) return new Promise(resolve => setTimeout(() => resolve(simulationResult), 400));
  if (!process.env.API_KEY) return { text: `⚠️ **Mode Offline**: Koneksi AI tidak tersedia karena API Key belum dikonfigurasi.`};
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let systemInstruction = `Anda adalah SIKILAT AI, asisten manajemen aset cerdas. Bantu user (sebagai ${user.peran}) dengan informasi yang akurat dari basis data internal.`;

  try {
    const parts: any[] = [{ text: message }];
    if (imageBase64 && mimeType) {
        parts.unshift({ inlineData: { data: imageBase64, mimeType } });
    }
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        config: { 
            systemInstruction,
            thinkingConfig: { thinkingBudget: 2000 }
        },
        contents: { parts },
    });
    return { text: response.text || "Maaf, sistem sedang mengalami kendala teknis." };
  } catch (error: any) {
    console.error("Chat Error:", error);
    return { text: `⚠️ AI sedang dalam pemeliharaan.` };
  }
};
