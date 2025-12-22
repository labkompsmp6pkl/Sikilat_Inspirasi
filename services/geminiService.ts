
import { GoogleGenAI } from "@google/genai";
import { User, GeminiResponse, PengaduanKerusakan, SavedData, LaporanStatus, TableName, PenilaianAset } from "../types";
import db from './dbService';

// Fix: Removed deprecated/forbidden global declaration to follow environment best practices.

const runSimulation = (message: string, user: User): GeminiResponse | null => {
    const cleanMessage = message.replace(/\[CONTEXT:[\s\S]*?\]\.\n\nUser's Reply:\s*/, "").trim();
    const lowerMsg = cleanMessage.toLowerCase();

    // 1. Handling Asset Evaluation Form Offline
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
                    text: `🌟 **Terima Kasih Atas Penilaian Anda!**\n\nFeedback Anda untuk **${barang}** telah kami simpan. Masukan ini sangat berharga untuk meningkatkan kualitas fasilitas sekolah.\n\n**Detail Penilaian:**\n- ⭐ **Skor:** ${skor}/5\n- 💬 **Ulasan:** "${ulasan}"`,
                    dataToSave: { table: 'penilaian_aset', payload: newEval }
                };
            }
        } catch (e) { console.error(e) }
    }

    // 2. Handling Audit Penilaian (Admin/Pengawas)
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
  if (simulationResult) return new Promise(resolve => setTimeout(() => resolve(simulationResult), 500));

  // Fix: Initializing GoogleGenAI right before use with correctly formatted named parameter.
  if (!process.env.API_KEY) return { text: `⚠️ **Offline Mode**: Fitur AI memerlukan API Key.`};
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let systemInstruction = `Anda adalah asisten AI SIKILAT. Jawablah dengan profesional.
    User: ${user.nama_lengkap} (${user.peran}).`;

  let userPrompt = message;
  // Fix: Ensure recommended models are used based on task complexity.
  let modelName = 'gemini-3-flash-preview';

  // Context Injection: Penilaian Aset for Summaries
  if (message.toLowerCase().match(/(kesimpulan|analisis|rangkuman|kinerja|strategis|penilaian|sentimen)/)) {
      const reports = db.getTable('pengaduan_kerusakan');
      const evals = db.getTable('penilaian_aset');
      
      const avgRating = evals.length > 0 ? (evals.reduce((a, b) => a + b.skor, 0) / evals.length).toFixed(1) : "0.0";
      const recentEvals = evals.slice(0, 5).map(e => `- [${e.skor}/5] ${e.nama_barang}: "${e.ulasan}"`).join('\n');

      const contextData = `
      [DATA PENILAIAN PENGGUNA]
      - Rata-rata Rating Global: ${avgRating}/5 dari ${evals.length} penilaian.
      - Ulasan Terakhir:
      ${recentEvals}
      
      [DATA KERUSAKAN]
      - Total Laporan: ${reports.length}
      - Status Pending: ${reports.filter(r => r.status === 'Pending').length}

      Instruksi: Sertakan analisis sentimen dari penilaian pengguna dalam kesimpulan manajerial Anda. Aset mana yang paling disukai dan mana yang paling dikeluhkan?`;
      
      userPrompt = `${userPrompt}\n\n${contextData}`;
      // Fix: Upgraded to pro-preview for complex reasoning tasks as per guidelines.
      modelName = 'gemini-3-pro-preview';
  }

  try {
    // Fix: Unified call to ai.models.generateContent with standard Content object array.
    const response = await ai.models.generateContent({
        model: modelName,
        config: { systemInstruction },
        contents: [{ parts: [{ text: userPrompt }] }],
    });
    // Fix: Accessed .text as a property (not a method) as specified in SDK documentation.
    return { text: response.text || "Respon kosong." };
  } catch (error: any) {
    return { text: `⚠️ Gagal: ${error.message}` };
  }
};
