
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
    DASHBOARD OPERASIONAL SIKILAT:
    
    1. INVENTARIS:
       - Total Aset: ${data.inventaris.length}
       - Kondisi Baik: ${data.inventaris.filter(i => i.status_barang === 'Baik').length}
       - Kondisi Rusak/Perbaikan: ${data.inventaris.filter(i => i.status_barang !== 'Baik').length}
    
    2. PENGADUAN KERUSAKAN (PENDING):
       ${data.reports.filter(r => r.status === 'Pending').slice(0, 10).map(r => `- [${r.kategori_aset}] ${r.nama_barang} @ ${r.lokasi_kerusakan}: ${r.deskripsi_masalah}`).join('\n')}
       - Total Tiket Menunggu: ${data.reports.filter(r => r.status === 'Pending').length}
    
    3. UTILISASI (BOOKING):
       ${data.bookings.filter(b => b.status_peminjaman === 'Disetujui').slice(0, 5).map(b => `- ${b.nama_barang} (${b.keperluan})`).join('\n')}
       - Antrian Menunggu: ${data.bookings.filter(b => b.status_peminjaman === 'Menunggu').length}
    
    4. AGENDA PETUGAS:
       ${data.activities.slice(0, 5).map(a => `- ${a.nama_pj}: ${a.uraian_kegiatan} (${a.status})`).join('\n')}
    `;

    const systemInstruction = `Anda adalah SIKILAT Strategic Intelligence - AI Analis Manajemen Infrastruktur.
    
    Tugas Anda: Memberikan Kesimpulan Strategis yang mendalam bagi manajemen sekolah.
    Tone: Otoritatif, profesional, berorientasi solusi, dan tajam.
    
    Struktur Kesimpulan:
    1. 📊 RINGKASAN KESEHATAN INFRASTRUKTUR: Evaluasi kondisi aset saat ini secara makro.
    2. 🔥 ANALISIS TITIK PANAS (HOTSPOTS): Identifikasi area atau kategori aset yang mengalami gangguan paling kritis.
    3. 🎯 REKOMENDASI PRIORITAS: Berikan 3 instruksi taktis untuk Penanggung Jawab.
    4. 🔮 PREDIKSI & MITIGASI: Apa yang akan terjadi jika masalah ini tidak segera ditangani.
    
    Gunakan Markdown yang rapi dengan heading yang tegas. Hindari kata-kata klise. Fokus pada data yang diberikan. Maksimal 200 kata.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            config: { 
                systemInstruction,
                thinkingConfig: { thinkingBudget: 4000 }
            },
            contents: { parts: [{ text: `Lakukan analisis strategis terhadap data berikut: ${context}` }] },
        });
        return response.text || "Gagal menghasilkan analisis.";
    } catch (e) {
        console.error("Gemini Error:", e);
        return "Terjadi kendala teknis saat menghubungkan ke otak AI.";
    }
};

export const generateReplySuggestion = async (reviewText: string, user: User): Promise<string> => {
    if (!process.env.API_KEY) return "Terima kasih.";
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const isAdmin = ['admin', 'pengawas_admin'].includes(user.peran);
    const systemInstruction = isAdmin 
        ? "Anda adalah Admin SIKILAT. Balas ulasan tamu secara profesional dan solutif (maks 20 kata)."
        : "Balas ulasan secara singkat dan sopan.";

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
    const cleanMessage = message.trim();

    if (cleanMessage.includes('📝 Input Formulir: Formulir Input Kegiatan PJ')) {
        return {
            text: `✅ **Data Kegiatan Berhasil Sinkron!**\n\nAgenda operasional telah tercatat di Cloud. Pengawas akan segera meninjau jadwal Anda.`,
            dataToSave: { table: 'agenda_kegiatan', payload: { id: `SIM-${Date.now()}`, status: 'Pending' } }
        };
    }

    if (cleanMessage.toLowerCase().includes('booking') || cleanMessage.toLowerCase().includes('pinjam')) {
        return { text: `Tentu, silakan gunakan formulir ini untuk mengajukan peminjaman aset:\n\n:::DATA_JSON:::{"type": "form_trigger", "formId": "booking_ruangan", "label": "Buka Formulir Booking"}` };
    }

    return null;
}

export const sendMessageToGemini = async (message: string, user: User, imageBase64?: string | null, mimeType?: string | null): Promise<GeminiResponse> => {
  const simulationResult = runSimulation(message, user);
  if (simulationResult) return new Promise(resolve => setTimeout(() => resolve(simulationResult), 500));
  if (!process.env.API_KEY) return { text: `⚠️ **Mode Offline**: Koneksi AI tidak tersedia.`};
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let systemInstruction = `Anda adalah SIKILAT AI, asisten manajemen aset cerdas. Bantu user (${user.peran}) dengan profesional.`;

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
    return { text: response.text || "Maaf, terjadi gangguan pada jaringan syaraf AI." };
  } catch (error: any) {
    console.error("Chat Error:", error);
    return { text: `⚠️ AI SIKILAT sedang dalam mode maintenance.` };
  }
};
