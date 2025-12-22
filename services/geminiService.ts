
import { GoogleGenAI } from "@google/genai";
import { User, GeminiResponse, PengaduanKerusakan, SavedData, LaporanStatus, TableName, PenilaianAset, PeminjamanAntrian, AgendaKegiatan } from "../types";
import db from './dbService';

export const generateReplySuggestion = async (reviewText: string, user: User): Promise<string> => {
    if (!process.env.API_KEY) return "Terima kasih atas masukannya.";
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const isAdmin = ['admin', 'pengawas_admin'].includes(user.peran);
    const systemInstruction = isAdmin 
        ? "Anda adalah Pengawas Admin sekolah yang bijak. Buatlah balasan singkat (maks 20 kata), profesional, dan solutif untuk ulasan fasilitas dari pengunjung/tamu berikut ini."
        : "Anda adalah Pengunjung/Tamu sekolah. Buatlah komentar tindak lanjut singkat (maks 15 kata) untuk memperjelas ulasan Anda sebelumnya mengenai fasilitas sekolah.";

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            config: { systemInstruction },
            contents: [{ parts: [{ text: `Ulasan/Konteks sebelumnya: "${reviewText}"` }] }],
        });
        return response.text || (isAdmin ? "Terima kasih, kami akan segera mengecek." : "Terima kasih atas tanggapannya.");
    } catch (e) {
        return isAdmin ? "Terima kasih atas laporannya, kami akan segera melakukan pengecekan." : "Ini adalah ulasan tambahan saya.";
    }
};

const runSimulation = (message: string, user: User): GeminiResponse | null => {
    const cleanMessage = message.replace(/\[CONTEXT:[\s\S]*?\]\.\n\nUser's Reply:\s*/, "").trim();
    const lowerMsg = cleanMessage.toLowerCase();

    // 1. Handling Asset Evaluation Form Trigger
    if (lowerMsg.includes('saya ingin memberi penilaian untuk aset:')) {
        if (user.peran !== 'tamu') {
            return {
                text: `Mohon maaf, Bapak/Ibu **${user.nama_lengkap}**. Fitur penilaian aset publik khusus disediakan bagi Tamu dan Pengunjung untuk evaluasi kualitas layanan sekolah.`
            };
        }
        const assetName = cleanMessage.split(':').pop()?.trim() || 'Aset';
        return {
            text: `Mempersiapkan formulir penilaian untuk **${assetName}**... \n\nSilakan lengkapi ulasan Anda melalui tombol di bawah: \n\n:::DATA_JSON:::{"type": "form_trigger", "formId": "penilaian_aset", "label": "Beri Penilaian ${assetName}", "assetName": "${assetName}"}`
        };
    }

    // 2. Handling Booking Trigger
    if (lowerMsg.includes('booking') || lowerMsg.includes('pinjam') || lowerMsg.includes('gunakan ruangan')) {
        return {
            text: `Baik Bapak/Ibu **${user.nama_lengkap}**, silakan isi detail waktu dan keperluan Anda pada formulir booking di bawah ini:\n\n:::DATA_JSON:::{"type": "form_trigger", "formId": "booking_ruangan", "label": "Buka Formulir Booking"}`
        };
    }

    // 3. Handling Input Kegiatan (PJ) Trigger
    if (lowerMsg.includes('catat kegiatan') || lowerMsg.includes('input kegiatan')) {
        return {
            text: `Baik Bapak/Ibu **${user.nama_lengkap}**, saya siap mencatat kegiatan operasional hari ini. Silakan lengkapi laporannya pada formulir di bawah:\n\n:::DATA_JSON:::{"type": "form_trigger", "formId": "input_kegiatan", "label": "Buka Formulir Kegiatan"}`
        };
    }

    // 4. Handling Input Kegiatan Form Submission
    if (cleanMessage.includes('📝 Input Formulir: Formulir Input Kegiatan PJ')) {
        try {
            const parse = (label: string) => {
                const regex = new RegExp(`🔹 ${label}:\\s*(.*)`);
                const match = cleanMessage.match(regex);
                return match ? match[1].trim() : '';
            };

            const posisi = parse('Lokasi Kegiatan');
            const uraian = parse('Uraian Kegiatan');
            const hasil = parse('Hasil / Output');
            const objek = parse('Target Pengguna');
            const mulai = parse('Waktu Mulai');
            const selesai = parse('Waktu Selesai');

            const newAgenda: AgendaKegiatan = {
                id: `AGD-${Date.now()}`,
                nama_pj: user.nama_lengkap,
                waktu_mulai: mulai,
                waktu_selesai: selesai,
                posisi: posisi,
                uraian_kegiatan: uraian,
                hasil_kegiatan: hasil,
                objek_pengguna: objek,
                status: 'Pending'
            };

            return {
                text: `✅ **Kegiatan Berhasil Dicatat!**\n\nAgenda Anda di **${posisi}** telah disimpan dan menunggu verifikasi Pengawas. Data ini juga sudah disinkronkan ke Couchbase.`,
                dataToSave: { table: 'agenda_kegiatan', payload: newAgenda }
            };
        } catch (e) { console.error(e) }
    }

    // 5. Handling Booking Form Submission
    if (cleanMessage.includes('📝 Input Formulir: Formulir Booking Ruangan/Alat')) {
        try {
            const parse = (label: string) => {
                const regex = new RegExp(`🔹 ${label}:\\s*(.*)`);
                const match = cleanMessage.match(regex);
                return match ? match[1].trim() : '';
            };

            const barang = parse('Nama Ruangan / Alat');
            const tgl = parse('Tanggal Penggunaan');
            const mulai = parse('Jam Mulai');
            const selesai = parse('Jam Selesai');
            const keperluan = parse('Keperluan Penggunaan');

            const newBooking: PeminjamanAntrian = {
                id_peminjaman: `pm-${Date.now()}`,
                id_barang: 'ASET-BOOKING',
                nama_barang: barang,
                id_pengguna: user.nama_lengkap,
                tanggal_peminjaman: new Date(tgl),
                jam_mulai: mulai,
                jam_selesai: selesai,
                keperluan: keperluan,
                tanggal_pengembalian_rencana: new Date(tgl),
                status_peminjaman: 'Menunggu'
            };

            return {
                text: `✅ **Booking Berhasil Diajukan!**\n\nPengajuan Anda untuk **${barang}** telah tersimpan di antrian cloud.`,
                dataToSave: { table: 'peminjaman_antrian', payload: newBooking }
            };
        } catch (e) { console.error(e) }
    }

    return null;
}

export const sendMessageToGemini = async (message: string, user: User, imageBase64?: string | null, mimeType?: string | null): Promise<GeminiResponse> => {
  const simulationResult = runSimulation(message, user);
  if (simulationResult) return new Promise(resolve => setTimeout(() => resolve(simulationResult), 400));

  if (!process.env.API_KEY) return { text: `⚠️ **Offline Mode**: Fitur AI memerlukan API Key.`};
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let systemInstruction = `Anda adalah SIKILAT AI Assistant. 
  Bantu pengguna sesuai perannya: Guru (Peminjaman), PJ (Kegiatan), Pengawas (Audit/Kesimpulan).`;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: { systemInstruction },
        contents: [{ parts: [{ text: message }] }],
    });
    return { text: response.text || "Terjadi kendala dalam memproses permintaan Anda." };
  } catch (error: any) {
    return { text: `⚠️ AI sedang sibuk.` };
  }
};
