
import { GoogleGenAI } from "@google/genai";
import { User, GeminiResponse, PengaduanKerusakan, SavedData, LaporanStatus, TableName, PenilaianAset } from "../types";
import db from './dbService';

const runSimulation = (message: string, user: User): GeminiResponse | null => {
    const cleanMessage = message.replace(/\[CONTEXT:[\s\S]*?\]\.\n\nUser's Reply:\s*/, "").trim();
    const lowerMsg = cleanMessage.toLowerCase();

    // 1. Handling Asset Evaluation Form Trigger (Conversational Start)
    if (lowerMsg.includes('saya ingin memberi penilaian untuk aset:')) {
        if (user.peran !== 'tamu') {
            return {
                text: `Mohon maaf, Bapak/Ibu **${user.nama_lengkap}**. Fitur penilaian aset publik khusus disediakan bagi Tamu dan Pengunjung untuk evaluasi kualitas layanan sekolah. Sebagai ${user.peran}, Anda dapat menggunakan fitur **Lapor Kerusakan** atau **Tanya Inventaris** di dashboard utama.`
            };
        }

        const assetName = cleanMessage.split(':').pop()?.trim() || 'Aset';
        return {
            text: `Mempersiapkan formulir penilaian untuk **${assetName}**... \n\nSilakan lengkapi ulasan Anda melalui tombol di bawah: \n\n:::DATA_JSON:::{"type": "form_trigger", "formId": "penilaian_aset", "label": "Beri Penilaian ${assetName}", "assetName": "${assetName}"}`
        };
    }

    // 2. Handling Admin Reply to Evaluation
    if (lowerMsg.includes('saya ingin membalas penilaian aset (id:')) {
        if (!['admin', 'pengawas_admin'].includes(user.peran)) {
            return { text: "Anda tidak memiliki otoritas untuk membalas penilaian tamu." };
        }
        
        const evalIdMatch = cleanMessage.match(/\(ID:\s*([^)]+)\)/);
        const evalId = evalIdMatch ? evalIdMatch[1].trim() : null;

        if (!evalId) return { text: "ID Penilaian tidak ditemukan." };

        return {
            text: `Membuka panel balasan untuk Penilaian **#${evalId}**... \n\nSilakan ketik balasan Anda di bawah ini secara langsung:`,
            // This is a simulation trick: we ask the user to just type the reply next
        };
    }

    // 3. Simulating the actual admin response saving
    if (user.peran === 'pengawas_admin' && !lowerMsg.includes('saya ingin membalas') && !lowerMsg.includes('audit')) {
        // Look for recent eval that user might be replying to
        const lastEvals = db.getTable('penilaian_aset');
        // Simple heuristic: if user typed something and we were in "reply mode" 
        // We'll just check if it looks like a reply
        if (cleanMessage.length > 5) {
             // In a real app we'd track state, here we assume any short message after a "Reply" prompt is the reply
             // Let's look for evaluations that don't have replies yet
             const target = lastEvals.find(e => !e.balasan_admin);
             if (target) {
                 target.balasan_admin = cleanMessage;
                 target.tanggal_balasan = new Date();
                 target.status_penanganan = 'Terbuka';
                 return {
                     text: `✅ **Balasan Terkirim!**\n\nPenilaian dari **${target.nama_pengguna}** telah dibalas. Tamu akan melihat tanggapan Anda di panel mereka.`,
                     dataToSave: { table: 'penilaian_aset', payload: target }
                 };
             }
        }
    }

    // 4. Handling Asset Evaluation Form Submission
    if (cleanMessage.includes('📝 Input Formulir: Beri Penilaian Aset')) {
        try {
            const parse = (label: string) => {
                const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`${escapedLabel}:\\s*(.*)`);
                const match = cleanMessage.match(regex);
                return match ? match[1].trim() : '';
            };

            const barang = parse('Nama Aset / Ruangan');
            const skor = parseInt(parse('Rating (1-5)')) || 5;
            const ulasan = parse('Ulasan / Masukan');

            if (barang && ulasan) {
                const newEval: PenilaianAset = {
                    id: `EV-${Date.now()}`,
                    id_barang: 'ASET-MANUAL',
                    nama_barang: barang,
                    id_pengguna: user.id_pengguna,
                    nama_pengguna: user.nama_lengkap,
                    skor: skor,
                    ulasan: ulasan,
                    tanggal: new Date(),
                    status_penanganan: 'Terbuka'
                };

                return {
                    text: `🌟 **Penilaian Berhasil Disimpan!**\n\nTerima kasih atas ulasan Anda untuk **${barang}**. Masukan Anda sangat berharga bagi pemeliharaan fasilitas sekolah kami.`,
                    dataToSave: { table: 'penilaian_aset', payload: newEval }
                };
            }
        } catch (e) { console.error(e) }
    }

    // 5. Audit Penilaian
    if (lowerMsg.includes('audit penilaian') || lowerMsg.includes('tampilkan semua data dari tabel penilaian_aset')) {
        if (!['admin', 'pengawas_admin'].includes(user.peran)) {
            return { text: "Akses Ditolak. Anda tidak memiliki otoritas untuk melihat data penilaian pengguna secara mendalam." };
        }
        const evals = db.getTable('penilaian_aset');
        if (evals.length > 0) {
            const formatted = evals.map(e => ({
                ID: e.id,
                Status: e.status_penanganan || 'Terbuka',
                Aset: e.nama_barang,
                Rating: `${e.skor}/5`,
                Ulasan: e.ulasan,
                Oleh: e.nama_pengguna,
                Balasan: e.balasan_admin ? "Sudah Dibalas" : "Belum Dibalas"
            }));
            return { text: `📜 **Audit Penilaian Aset Terbaru**\nBerikut adalah log ulasan dari tamu dan pengunjung:\n:::DATA_JSON:::${JSON.stringify(formatted)}` };
        }
        return { text: "Belum ada data penilaian aset yang tercatat di database." };
    }

    return null;
}

export const sendMessageToGemini = async (message: string, user: User, imageBase64?: string | null, mimeType?: string | null): Promise<GeminiResponse> => {
  const simulationResult = runSimulation(message, user);
  if (simulationResult) return new Promise(resolve => setTimeout(() => resolve(simulationResult), 400));

  if (!process.env.API_KEY) return { text: `⚠️ **Offline Mode**: Fitur AI memerlukan API Key.`};
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let systemInstruction = `Anda adalah SIKILAT AI Assistant.
  PANDUAN INTERAKSI:
  1. GURU/PJ/IT: Fokus teknis operasional.
  2. TAMU: Fokus penilaian & komplain. Jika Tamu membalas 'Selesai' pada tanggapan admin, ucapkan terima kasih.
  3. PENGAWAS ADMIN: Fokus membalas (reply) penilaian tamu. Gunakan nada bijak dan solutif.
  
  User saat ini: ${user.nama_lengkap} (Role: ${user.peran}).`;

  let userPrompt = message;
  let modelName = 'gemini-3-flash-preview';

  if (message.toLowerCase().match(/(kesimpulan ai|analisis strategis|prediksi tren)/)) {
      const reports = db.getTable('pengaduan_kerusakan');
      const evals = db.getTable('penilaian_aset');
      const avgRating = evals.length > 0 ? (evals.reduce((a, b) => a + b.skor, 0) / evals.length).toFixed(1) : "0.0";
      const contextData = `
      [STATISTIK REAL-TIME]
      - Rata-rata Rating Aset: ${avgRating}/5
      - Total Laporan Kerusakan: ${reports.length}
      - Laporan Status Pending: ${reports.filter(r => r.status === 'Pending').length}`;
      userPrompt = `${userPrompt}\n\n${contextData}`;
      modelName = 'gemini-3-pro-preview';
  }

  try {
    const response = await ai.models.generateContent({
        model: modelName,
        config: { systemInstruction },
        contents: [{ parts: [{ text: userPrompt }] }],
    });
    return { text: response.text || "Terjadi kendala dalam memproses permintaan Anda." };
  } catch (error: any) {
    return { text: `⚠️ AI sedang sibuk. Silakan coba sesaat lagi.` };
  }
};
