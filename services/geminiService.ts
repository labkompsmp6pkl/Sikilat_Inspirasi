
import { GoogleGenAI } from "@google/genai";
import { User, GeminiResponse, PengaduanKerusakan, SavedData, LaporanStatus, TableName, PenilaianAset } from "../types";
import db from './dbService';

const runSimulation = (message: string, user: User): GeminiResponse | null => {
    const cleanMessage = message.replace(/\[CONTEXT:[\s\S]*?\]\.\n\nUser's Reply:\s*/, "").trim();
    const lowerMsg = cleanMessage.toLowerCase();

    // 1. Handling Asset Evaluation Form Trigger (Conversational Start)
    if (lowerMsg.includes('saya ingin memberi penilaian untuk aset:')) {
        // Restriction check: Only Tamu can fill
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

    // 2. Handling Asset Evaluation Form Submission
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
                    text: `🌟 **Penilaian Berhasil Disimpan!**\n\nTerima kasih atas ulasan Anda untuk **${barang}**. Masukan Anda sangat berharga bagi pemeliharaan fasilitas sekolah kami.`,
                    dataToSave: { table: 'penilaian_aset', payload: newEval }
                };
            }
        } catch (e) { console.error(e) }
    }

    // 3. Audit Penilaian (Strictly for Admins & Monitoring Roles)
    if (lowerMsg.includes('audit penilaian') || lowerMsg.includes('tampilkan semua data dari tabel penilaian_aset')) {
        if (!['admin', 'pengawas_admin'].includes(user.peran)) {
            return { text: "Akses Ditolak. Anda tidak memiliki otoritas untuk melihat data penilaian pengguna secara mendalam." };
        }
        const evals = db.getTable('penilaian_aset');
        if (evals.length > 0) {
            const formatted = evals.map(e => ({
                Tanggal: new Date(e.tanggal).toLocaleDateString(),
                Aset: e.nama_barang,
                Rating: `${e.skor}/5`,
                Ulasan: e.ulasan,
                Oleh: e.nama_pengguna
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
  PANDUAN PERAN & FITUR:
  1. GURU/PJ/IT/SARPRAS: Fokus pada manajemen teknis, pelaporan, dan operasional. JANGAN tawarkan atau layani fitur penilaian aset kepada mereka.
  2. TAMU: Satu-satunya peran yang diperbolehkan mengisi 'Penilaian Aset'. Layani dengan form trigger jika diminta.
  3. ADMIN/PENGAWAS ADMIN: Fokus pada audit data dan kesimpulan manajerial.
  
  KUALITAS RESPONS:
  - Sangat singkat dan to-the-point.
  - Gunakan JSON :::DATA_JSON::: untuk tombol aksi form_trigger.
  - Profesional namun membantu.
  
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
