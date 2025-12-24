
import { GoogleGenAI } from "@google/genai";
import { User, GeminiResponse, PengaduanKerusakan, SavedData, LaporanStatus, TableName, PenilaianAset, PeminjamanAntrian, AgendaKegiatan, Inventaris } from "../types";

export const generateGlobalConclusion = async (data: {
    reports: PengaduanKerusakan[],
    bookings: PeminjamanAntrian[],
    activities: AgendaKegiatan[],
    inventaris: Inventaris[]
}, user: User): Promise<string> => {
    if (!process.env.API_KEY) return "Fitur AI memerlukan API Key aktif.";
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const context = `
    DATA REAL-TIME SIKILAT:
    
    1. INVENTARIS: Total ${data.inventaris.length} aset. Baik: ${data.inventaris.filter(i => i.status_barang === 'Baik').length}, Butuh Perhatian: ${data.inventaris.filter(i => i.status_barang !== 'Baik').length}.
    2. LAPORAN KERUSAKAN: ${data.reports.filter(r => r.status === 'Pending').length} tiket pending. Contoh: ${data.reports.filter(r => r.status === 'Pending').slice(0,3).map(r => r.nama_barang + ' di ' + r.lokasi_kerusakan).join(', ')}.
    3. BOOKING AKTIF: ${data.bookings.filter(b => b.status_peminjaman === 'Disetujui').length} disetujui, ${data.bookings.filter(b => b.status_peminjaman === 'Menunggu').length} menunggu.
    4. AGENDA PETUGAS: ${data.activities.length} agenda terdaftar.
    `;

    const systemInstruction = `Anda adalah SIKILAT AI Analis Manajemen Infrastruktur.
    Tugas: Berikan Kesimpulan Strategis singkat (maks 200 kata) bagi manajemen sekolah berdasarkan data live di atas.
    Fokus pada: 📊 Ringkasan Kesehatan Aset, 🔥 Titik Masalah Kritis, dan 🎯 Rekomendasi Tindakan Segera.
    Gunakan Markdown yang profesional dan tajam.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            config: { systemInstruction },
            contents: { parts: [{ text: `Analisis data ini: ${context}` }] },
        });
        return response.text || "Gagal melakukan analisis.";
    } catch (e) {
        return "Terjadi kendala saat menghubungkan ke AI Strategic Node.";
    }
};

export const sendMessageToGemini = async (message: string, user: User, imageBase64?: string | null, mimeType?: string | null): Promise<GeminiResponse> => {
  if (!process.env.API_KEY) return { text: `⚠️ **Mode Offline**: Koneksi AI tidak tersedia.`};
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let systemInstruction = `Anda adalah SIKILAT AI Assistant. User adalah ${user.peran}.
  
  Format Response:
  - Gunakan bahasa Indonesia yang profesional.
  - Jika user ingin melaporkan, meminjam, atau input data, Anda HARUS menyertakan widget form JSON dengan format:
    :::DATA_JSON:::{"type": "form_trigger", "formId": "ID_FORM", "label": "LABEL_TOMBOL", "assetName": "NAMA_ASET_JIKA_ADA"}
  
  ID FORM TERSEDIA:
  - booking_ruangan
  - lapor_kerusakan
  - input_kegiatan
  - penilaian_aset
  - cek_laporan`;

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
    return { text: response.text || "Maaf, AI sedang melakukan sinkronisasi ulang." };
  } catch (error: any) {
    return { text: `⚠️ AI SIKILAT sedang dalam mode pemeliharaan.` };
  }
};
