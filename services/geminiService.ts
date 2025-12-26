
import { GoogleGenAI } from "@google/genai";
import { User, GeminiResponse, PengaduanKerusakan, PeminjamanAntrian, AgendaKegiatan, Inventaris } from "../types";

export const generateGlobalConclusion = async (data: {
    reports: PengaduanKerusakan[],
    bookings: PeminjamanAntrian[],
    activities: AgendaKegiatan[],
    inventaris: Inventaris[]
}, user: User): Promise<string> => {
    if (!process.env.API_KEY) return "AI Key tidak terdeteksi.";
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const itCount = data.inventaris.length;
    const pendingTickets = data.reports.filter(r => r.status === 'Pending').length;
    const activeBookings = data.bookings.filter(b => b.status_peminjaman === 'Disetujui').length;
    
    const context = `
    DASHBOARD LIVE DATA:
    - Total Inventaris: ${itCount} unit.
    - Tiket Kerusakan Pending: ${pendingTickets} tiket.
    - Booking Disetujui: ${activeBookings} antrian.
    - Agenda Kegiatan: ${data.activities.length} agenda.
    `;

    const systemInstruction = `Anda adalah Executive AI Analyst untuk SIKILAT (Sistem Informasi Kilat Aset).
    Tugas Anda:
    1. Analisis performa pemeliharaan aset berdasarkan jumlah tiket pending.
    2. Berikan 3 poin rekomendasi strategis untuk manajemen sekolah.
    3. Gunakan Bahasa Indonesia profesional, tegas, dan inspiratif.
    Format output: Markdown dengan emoji. Maksimal 200 kata.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            config: { systemInstruction },
            contents: { parts: [{ text: `Lakukan analisis terhadap data berikut: ${context}` }] },
        });
        return response.text || "Gagal menghasilkan kesimpulan.";
    } catch (e) {
        return "Gagal menghubungkan Intelligence Node. Cek API Key Anda.";
    }
};

export const sendMessageToGemini = async (message: string, user: User, imageBase64?: string | null, mimeType?: string | null): Promise<GeminiResponse> => {
  if (!process.env.API_KEY) return { text: `API Key Missing.`};
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemInstruction = `Anda adalah SIKILAT AI Assistant. Anda membantu user role ${user.peran} mengelola aset sekolah.
  Gunakan Bahasa Indonesia. Gunakan :::DATA_JSON::: untuk mengirimkan widget jika relevan (form lapor_kerusakan, booking_ruangan, dll).
  Jika user bertanya tentang status, arahkan ke dashboard.`;

  try {
    const parts: any[] = [{ text: message }];
    if (imageBase64 && mimeType) parts.push({ inlineData: { data: imageBase64, mimeType } });
    
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        config: { systemInstruction },
        contents: { parts },
    });
    return { text: response.text || "Respon kosong." };
  } catch (error) {
    return { text: `⚠️ Gangguan pada Intelligence Node.` };
  }
};
