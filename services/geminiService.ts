
import { GoogleGenAI } from "@google/genai";
import { User, GeminiResponse, PengaduanKerusakan, SavedData, LaporanStatus, TableName, PenilaianAset } from "../types";
import db from './dbService';

const runSimulation = (message: string, user: User): GeminiResponse | null => {
    const cleanMessage = message.replace(/\[CONTEXT:[\s\S]*?\]\.\n\nUser's Reply:\s*/, "").trim();
    const lowerMsg = cleanMessage.toLowerCase();

    // 1. Handling Asset Evaluation Form Trigger (Conversational Start)
    if (lowerMsg.includes('saya ingin memberi penilaian untuk aset:')) {
        const assetName = cleanMessage.split(':').pop()?.trim() || 'Aset';
        
        return {
            text: `Mempersiapkan formulir penilaian untuk **${assetName}**... \n\nSilakan klik tombol di bawah untuk mengisi detailnya: \n\n:::DATA_JSON:::{"type": "form_trigger", "formId": "penilaian_aset", "label": "Beri Penilaian ${assetName}", "assetName": "${assetName}"}`
        };
    }

    // 2. Handling Asset Evaluation Form Submission (After form fill)
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
                    tanggal: new Date()
                };

                return {
                    text: `🌟 **Penilaian Berhasil Disimpan!**\n\nTerima kasih, ulasan Anda untuk **${barang}** telah masuk ke sistem. \n\n**Ringkasan:**\n- ⭐ Skor: ${skor}/5\n- 💬 Ulasan: "${ulasan}"`,
                    dataToSave: { table: 'penilaian_aset', payload: newEval }
                };
            }
        } catch (e) { console.error(e) }
    }

    // 3. Handling Audit Penilaian (Admin/Pengawas)
    if (lowerMsg.includes('audit penilaian') || lowerMsg.includes('tampilkan semua data dari tabel penilaian_aset')) {
        const evals = db.getTable('penilaian_aset');
        if (evals.length > 0) {
            const formatted = evals.map(e => ({
                Tanggal: new Date(e.tanggal).toLocaleDateString(),
                Aset: e.nama_barang,
                Rating: `${e.skor} / 5`,
                Ulasan: e.ulasan,
                Oleh: e.nama_pengguna
            }));
            return { text: `📜 **Daftar Penilaian Aset & Fasilitas**\nBerikut adalah masukan terbaru dari pengguna:\n:::DATA_JSON:::${JSON.stringify(formatted)}` };
        }
        return { text: "Belum ada data penilaian aset yang masuk." };
    }

    return null;
}

export const sendMessageToGemini = async (message: string, user: User, imageBase64?: string | null, mimeType?: string | null): Promise<GeminiResponse> => {
  const simulationResult = runSimulation(message, user);
  if (simulationResult) return new Promise(resolve => setTimeout(() => resolve(simulationResult), 400));

  if (!process.env.API_KEY) return { text: `⚠️ **Offline Mode**: Fitur AI memerlukan API Key.`};
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let systemInstruction = `Anda adalah SIKILAT AI Assistant. 
  Tugas utama Anda adalah membantu pengguna mengelola aset sekolah dengan cepat.
  ATURAN KETAT:
  1. Jangan memberikan narasi panjang atau ringkasan riwayat aset saat pengguna ingin memberi penilaian. Langsung berikan tombol form trigger.
  2. Gunakan JSON :::DATA_JSON::: untuk memberikan tombol aksi ("form_trigger") setiap kali pengguna menyebut ingin melaporkan atau menilai sesuatu.
  3. Nada bicara: Sangat singkat, profesional, dan to-the-point.
  4. User: ${user.nama_lengkap} (Role: ${user.peran}).`;

  let userPrompt = message;
  let modelName = 'gemini-3-flash-preview';

  if (message.toLowerCase().match(/(kesimpulan ai|analisis strategis|prediksi tren)/)) {
      const reports = db.getTable('pengaduan_kerusakan');
      const evals = db.getTable('penilaian_aset');
      const avgRating = evals.length > 0 ? (evals.reduce((a, b) => a + b.skor, 0) / evals.length).toFixed(1) : "0.0";
      const contextData = `
      [DATA KONTEKS]
      - Rata-rata Rating: ${avgRating}/5
      - Total Penilaian: ${evals.length}
      - Total Laporan Kerusakan: ${reports.length}
      - Status Laporan Pending: ${reports.filter(r => r.status === 'Pending').length}`;
      userPrompt = `${userPrompt}\n\n${contextData}`;
      modelName = 'gemini-3-pro-preview';
  }

  try {
    const response = await ai.models.generateContent({
        model: modelName,
        config: { systemInstruction },
        contents: [{ parts: [{ text: userPrompt }] }],
    });
    return { text: response.text || "Mohon maaf, terjadi gangguan pada sistem AI." };
  } catch (error: any) {
    return { text: `⚠️ Koneksi AI terputus. Silakan coba lagi beberapa saat lagi.` };
  }
};
