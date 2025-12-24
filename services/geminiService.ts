
import { GoogleGenAI } from "@google/genai";
import { User, GeminiResponse, PengaduanKerusakan, TableName, PenilaianAset, PeminjamanAntrian, AgendaKegiatan, Inventaris } from "../types";

export const generateGlobalConclusion = async (data: {
    reports: PengaduanKerusakan[],
    bookings: PeminjamanAntrian[],
    activities: AgendaKegiatan[],
    inventaris: Inventaris[]
}, user: User): Promise<string> => {
    if (!process.env.API_KEY) return "Fitur AI memerlukan API Key aktif di lingkungan pengembangan.";
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const itStats = {
        total: data.inventaris.filter(i => i.kategori === 'IT').length,
        baik: data.inventaris.filter(i => i.kategori === 'IT' && i.status_barang === 'Baik').length,
        rusak: data.inventaris.filter(i => i.kategori === 'IT' && i.status_barang !== 'Baik').length
    };

    const sarprasStats = {
        total: data.inventaris.filter(i => i.kategori === 'Sarpras').length,
        baik: data.inventaris.filter(i => i.kategori === 'Sarpras' && i.status_barang === 'Baik').length,
        rusak: data.inventaris.filter(i => i.kategori === 'Sarpras' && i.status_barang !== 'Baik').length
    };

    const context = `
    KONTEKS OPERASIONAL SIKILAT:
    
    1. INVENTARIS IT: ${itStats.total} total. Baik: ${itStats.baik}, Rusak/Perbaikan: ${itStats.rusak}.
    2. INVENTARIS SARPRAS: ${sarprasStats.total} total. Baik: ${sarprasStats.baik}, Rusak/Perbaikan: ${sarprasStats.rusak}.
    3. TIKET KERUSAKAN: ${data.reports.filter(r => r.status === 'Pending').length} pending, ${data.reports.filter(r => r.status === 'Proses').length} sedang dikerjakan.
    4. UTILISASI: ${data.bookings.filter(b => b.status_peminjaman === 'Disetujui').length} booking disetujui, ${data.bookings.filter(b => b.status_peminjaman === 'Menunggu').length} menunggu persetujuan.
    5. AGENDA PJ: ${data.activities.filter(a => a.status === 'Pending').length} agenda perbaikan/maintenance menunggu review.
    `;

    const systemInstruction = `Anda adalah SIKILAT AI Analyst (Executive Level).
    Tugas: Berikan "Executive Strategic Summary" singkat (maks 250 kata) untuk Manajemen Sekolah.
    Poin Analisis:
    - 🛡️ Kesehatan Infrastruktur: Evaluasi kondisi IT vs Sarpras.
    - ⚡ Bottleneck Operasional: Soroti tiket pending atau antrian booking.
    - 🎯 Roadmap Tindakan: Berikan 3 poin rekomendasi taktis untuk PJ (Penanggung Jawab).
    Gunakan Bahasa Indonesia yang tajam, profesional, dan gunakan Markdown.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            config: { systemInstruction },
            contents: { parts: [{ text: `Lakukan analisis mendalam berdasarkan data real-time ini: ${context}` }] },
        });
        return response.text || "AI gagal memproses data saat ini.";
    } catch (e) {
        console.error("AI Global Summary Error:", e);
        return "Terjadi kendala saat menghubungkan ke Strategic Intelligence Node.";
    }
};

export const sendMessageToGemini = async (message: string, user: User, imageBase64?: string | null, mimeType?: string | null): Promise<GeminiResponse> => {
  if (!process.env.API_KEY) return { text: `⚠️ **API Key Missing**: Hubungkan API Key di backend.`};
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let systemInstruction = `Anda adalah SIKILAT AI Assistant. User Anda adalah ${user.peran}.
  
  Format Respons:
  - Gunakan bahasa Indonesia yang membantu dan profesional.
  - Jika user mengeluh soal barang rusak, tawarkan untuk memicu :::DATA_JSON::: form 'lapor_kerusakan'.
  - Jika user ingin pinjam ruangan/alat, pemicu form 'booking_ruangan'.
  - Anda memiliki akses data melalui :::DATA_JSON::: widget untuk membantu visualisasi.
  
  ID FORM AKTIF:
  - booking_ruangan (Untuk Guru/Siswa)
  - lapor_kerusakan (Untuk semua)
  - input_kegiatan (Khusus Penanggung Jawab)
  - penilaian_aset (Untuk Tamu/Ortu)
  - cek_laporan (Tracking ID Tiket)`;

  try {
    const parts: any[] = [{ text: message }];
    if (imageBase64 && mimeType) {
        parts.unshift({ inlineData: { data: imageBase64, mimeType } });
    }
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        config: { systemInstruction },
        contents: { parts },
    });
    return { text: response.text || "Respon kosong dari AI." };
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    return { text: `⚠️ Koneksi AI terganggu. SIKILAT sedang melakukan sinkronisasi ulang.` };
  }
};
