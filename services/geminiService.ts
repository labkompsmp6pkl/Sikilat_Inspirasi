
import { GoogleGenAI } from "@google/genai";
import { User, GeminiResponse, PengaduanKerusakan, SavedData, LaporanStatus, TableName, TroubleshootingGuide, DetailedItemReport, Inventaris, PeminjamanAntrian, AgendaKegiatan, QueueStatus } from "../types";
import db from './dbService';

// Ensure process.env is typed if types are missing in the environment
declare var process: { env: { API_KEY: string } };

let ai: GoogleGenAI | null = null;

try {
    // API Key must be obtained exclusively from process.env.API_KEY per guidelines
    // Using a try-catch block to prevent app crash if key is missing, maintaining simulation/offline capabilities
    if (process.env.API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } else {
        console.warn("API_KEY not found in process.env. App will run in offline simulation mode.");
    }
} catch (error) {
    console.error("Failed to initialize Gemini client. Running in offline/simulation mode.", error);
}

const generateReportId = (user: User) => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const role = user.peran === 'tamu' ? 'TAMU' : user.peran.substring(0, 4).toUpperCase();
    return `SKL-${role}-${year}${month}${day}-${random}`;
}

// --- INTELLIGENT SIMULATION ENGINE ---
const runSimulation = (message: string, user: User): GeminiResponse | null => {
    // [CRITICAL FIX] Bersihkan pesan dari Konteks Reply agar simulasi tidak bingung.
    const cleanMessage = message.replace(/\[CONTEXT:[\s\S]*?\]\.\n\nUser's Reply:\s*/, "").trim();
    const lowerMsg = cleanMessage.toLowerCase();

    // --- 0. BYPASS UNTUK KELUHAN & PROBING ---
    if (ai && lowerMsg.match(/(kacau|aneh|salah|gak sesuai|tidak sesuai|error|masalah|kenapa|kok|padahal|gimana ini|bingung|tolong cek|kurang nyambung|bukan itu|dipakai statusnya)/)) {
        return null; 
    }

    // --- 1. PRIORITAS UTAMA: PARSING FORMULIR OFFLINE ---
    if (cleanMessage.includes('📝 Input Formulir:')) {
        // A. Handle Agenda Kegiatan
        if (cleanMessage.includes('Input Agenda Kegiatan')) {
            try {
                const parse = (label: string) => {
                    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
                    const regex = new RegExp(`${escapedLabel}:\\s*(.*)`);
                    const match = cleanMessage.match(regex);
                    return match ? match[1].trim() : '';
                };

                const waktuMulai = parse('Waktu Mulai');
                const waktuSelesai = parse('Waktu Selesai');
                const posisi = parse('Posisi / Lokasi');
                const objek = parse('Objek Pengguna');
                const uraian = parse('Uraian Kegiatan');
                const hasil = parse('Hasil Kegiatan');
                
                if (waktuMulai && posisi && uraian) {
                    const newAgenda: AgendaKegiatan = {
                        id: `AGD-${Date.now()}`,
                        nama_pj: user.nama_lengkap,
                        id_pj: user.id_pengguna,
                        waktu_mulai: waktuMulai,
                        waktu_selesai: waktuSelesai,
                        posisi: posisi,
                        objek_pengguna: objek || 'Umum',
                        uraian_kegiatan: uraian,
                        hasil_kegiatan: hasil || '-',
                        status: 'Pending'
                    };

                    const dataToSave: SavedData = {
                        table: 'agenda_kegiatan',
                        payload: newAgenda
                    };

                    return {
                        text: `✅ **Agenda Berhasil Dicatat (Mode Offline)**\n\nInput Anda telah berhasil disimpan ke database.\n\n**Detail Kegiatan:**\n- 📅 **Waktu:** ${newAgenda.waktu_mulai.toString().replace('T', ' ')}\n- 📍 **Lokasi:** ${newAgenda.posisi}\n- 📝 **Uraian:** ${newAgenda.uraian_kegiatan}\n\n_Catatan: Data diproses secara lokal untuk menghemat kuota AI._`,
                        dataToSave
                    };
                }
            } catch (e) {
                console.error("Error parsing agenda offline", e);
            }
        }

        // B. Handle Lapor Kerusakan
        if (cleanMessage.includes('Formulir Lapor Kerusakan')) {
             try {
                const parse = (label: string) => {
                    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`${escapedLabel}:\\s*(.*)`);
                    const match = cleanMessage.match(regex);
                    return match ? match[1].trim() : '';
                };

                const barang = parse('Nama Barang');
                const lokasi = parse('Lokasi');
                const masalah = parse('Deskripsi Masalah');
                const urgensi = parse('Tingkat Urgensi');

                if (barang && masalah) {
                    const newReportId = generateReportId(user);
                    const newReport: PengaduanKerusakan = {
                        id: newReportId,
                        id_barang: 'MANUAL-INPUT',
                        id_pengadu: user.id_pengguna,
                        nama_pengadu: user.nama_lengkap,
                        tanggal_lapor: new Date(),
                        nama_barang: barang,
                        lokasi_kerusakan: lokasi,
                        deskripsi_masalah: `${masalah} [Urgensi: ${urgensi}]`,
                        status: 'Pending',
                        kategori_aset: 'General'
                    };

                    return {
                        text: `✅ **Laporan Kerusakan Diterima (Mode Offline)**\n\nLaporan Anda telah disimpan. Tim teknis akan segera meninjau.\n\n**ID Tiket:** \`${newReportId}\`\n**Barang:** ${barang}\n**Masalah:** ${masalah}`,
                        dataToSave: { table: 'pengaduan_kerusakan', payload: newReport }
                    };
                }
             } catch (e) { console.error(e) }
        }
        
        // C. Handle Booking Ruangan
        if (cleanMessage.includes('Booking Ruangan')) {
             try {
                const parse = (label: string) => {
                    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`${escapedLabel}:\\s*(.*)`);
                    const match = cleanMessage.match(regex);
                    return match ? match[1].trim() : '';
                };

                const objek = parse('Ruangan / Alat');
                const tanggal = parse('Tanggal Peminjaman');
                const jamMulai = parse('Jam Mulai');
                const jamSelesai = parse('Jam Selesai');
                const keperluan = parse('Keperluan');

                if (objek && tanggal) {
                     const newBooking: PeminjamanAntrian = {
                        id_peminjaman: `BOOK-${Date.now()}`,
                        id_barang: 'MANUAL',
                        nama_barang: objek,
                        id_pengguna: user.id_pengguna,
                        tanggal_peminjaman: new Date(tanggal),
                        jam_mulai: jamMulai,
                        jam_selesai: jamSelesai,
                        keperluan: keperluan,
                        tanggal_pengembalian_rencana: new Date(tanggal),
                        status_peminjaman: 'Menunggu'
                    };

                    return {
                        text: `✅ **Pengajuan Booking Diterima (Mode Offline)**\n\nPermintaan peminjaman **${objek}** untuk tanggal ${tanggal} sedang diproses.\n\nSilakan cek status secara berkala.`,
                        dataToSave: { table: 'peminjaman_antrian', payload: newBooking }
                    };
                }
             } catch (e) { console.error(e) }
        }
    }


    // CRITICAL: BYPASS SIMULATION FOR ANALYSIS & CONTACT REQUESTS
    if (ai && lowerMsg.match(/(kesimpulan|analisis|rangkuman|kinerja|strategis|rekomendasi)/)) return null; 
    if (ai && lowerMsg.match(/(kontak|hubungi|telepon|email|admin|petugas)/)) return null;
    
    // --- QUICK ACTION HANDLERS ---

    // Handler 1: Tiket Pending
    if (lowerMsg.includes("query data status='pending'") || lowerMsg.includes("tiket pending")) {
        const reports = db.getTable('pengaduan_kerusakan');
        const pendingReports = reports.filter(r => r.status === 'Pending');
        
        if (pendingReports.length > 0) {
             const formatted = pendingReports.map(r => ({
                ID: r.id,
                Barang: r.nama_barang,
                Masalah: r.deskripsi_masalah,
                Lokasi: r.lokasi_kerusakan,
                Pelapor: r.nama_pengadu
             }));
             return { text: `📋 **Daftar Tiket Pending**\nBerikut adalah data laporan yang belum diproses:\n:::DATA_JSON:::${JSON.stringify(formatted)}` };
        } else {
            return { text: "✅ **Tidak ada tiket pending.** Semua laporan telah diproses atau diselesaikan." };
        }
    }

    // Handler 2: Cek Antrian Peminjaman (HIGH PRIORITY)
    const queueKeywords = /(?:cek|lihat|tampilkan|status)\s+.*(?:antrian|booking|peminjaman)/i;
    
    if (queueKeywords.test(lowerMsg)) {
        const bookings = db.getTable('peminjaman_antrian');
        const uniqueItems = Array.from(new Set(bookings.map(b => b.nama_barang)));
        
        let targetItem = "";
        const specificMatch = cleanMessage.match(/(?:untuk|:)\s+(.*)/i);
        
        if (specificMatch && specificMatch[1]) {
            targetItem = specificMatch[1].trim().replace(/[?.!]*$/, "");
        } else {
            for (const item of uniqueItems) {
                if (lowerMsg.includes(item.toLowerCase())) {
                    targetItem = item;
                    break;
                }
            }
        }

        if (!targetItem) {
             if (uniqueItems.length > 0) targetItem = uniqueItems[0];
             else return { text: "📂 Belum ada data peminjaman di database saat ini. Anda bisa langsung melakukan booking." };
        }

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // Helper untuk parse waktu "HH:MM" ke integer menit
        const parseMinutes = (timeStr: string) => {
            if (!timeStr) return 0;
            const parts = timeStr.split(':');
            return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        };

        // Filter bookings for the target item AND Remove Expired Past Bookings
        const itemBookings = bookings
            .filter(b => {
                const isTarget = b.nama_barang.toLowerCase() === targetItem.toLowerCase();
                const isNotReturned = b.status_peminjaman !== 'Kembali' && b.status_peminjaman !== 'Ditolak';
                
                if (!isTarget || !isNotReturned) return false;

                const bookingDate = new Date(b.tanggal_peminjaman);
                const [endHour, endMinute] = b.jam_selesai ? b.jam_selesai.split(':').map(Number) : [23, 59];
                bookingDate.setHours(endHour, endMinute, 0);

                if (bookingDate < now) return false;

                return true;
            })
            .sort((a,b) => new Date(a.tanggal_peminjaman).getTime() - new Date(b.tanggal_peminjaman).getTime());

        // Determine current status
        let currentUser = undefined;
        let isOccupied = false;

        // Check if anyone is using it NOW (Lebih Akurat menggunakan Menit)
        const activeNow = itemBookings.find(b => {
            const bDate = new Date(b.tanggal_peminjaman);
            
            // Cek Tanggal (Exact Date Only)
            const isSameDate = bDate.getDate() === now.getDate() && 
                               bDate.getMonth() === now.getMonth() && 
                               bDate.getFullYear() === now.getFullYear();

            if (!isSameDate) return false;
            if (b.status_peminjaman !== 'Disetujui') return false; 
            if (!b.jam_mulai || !b.jam_selesai) return false;

            const startMins = parseMinutes(b.jam_mulai);
            const endMins = parseMinutes(b.jam_selesai);

            // Cek Range Waktu (Inclusive Start, Exclusive End)
            return currentMinutes >= startMins && currentMinutes < endMins;
        });

        if (activeNow) {
            isOccupied = true;
            const userObj = db.getTable('pengguna').find(u => u.id_pengguna === activeNow.id_pengguna);
            currentUser = {
                nama: userObj ? userObj.nama_lengkap : activeNow.id_pengguna,
                sampai_jam: activeNow.jam_selesai || 'Selesai'
            };
        }

        const queueList = itemBookings
            .filter(b => b !== activeNow) 
            .map(b => {
                const userObj = db.getTable('pengguna').find(u => u.id_pengguna === b.id_pengguna);
                
                let statusLabel: string = b.status_peminjaman;
                if (b.status_peminjaman === 'Menunggu') {
                    statusLabel = 'Belum Diproses (Menunggu PJ)';
                }

                return {
                    peminjam: userObj ? userObj.nama_lengkap : b.id_pengguna,
                    waktu: `${new Date(b.tanggal_peminjaman).toLocaleDateString()} ${b.jam_mulai ? `(${b.jam_mulai}-${b.jam_selesai})` : ''}`,
                    keperluan: b.keperluan || '-',
                    status: statusLabel
                }
            });

        const statusResponse: QueueStatus = {
            type: 'queue_status',
            nama_barang: targetItem, 
            sedang_dipakai: isOccupied,
            pemakai_saat_ini: currentUser,
            jumlah_antrian: queueList.length,
            antrian_berikutnya: queueList
        };

        const responseText = isOccupied 
            ? `⚠️ **${targetItem} Sedang Digunakan!**\n\nRuangan ini sedang dipakai oleh **${currentUser?.nama}** sampai jam ${currentUser?.sampai_jam}.`
            : `✅ **${targetItem} Tersedia!**\n\nRuangan/Alat ini saat ini kosong dan tidak ada antrian aktif. Anda bisa langsung memesannya sekarang.`;

        return { 
            text: `${responseText}\n:::DATA_JSON:::${JSON.stringify(statusResponse)}` 
        };
    }

    // RULE 2: Handle "Cek Status Laporan" from form/text
    const statusCheckRegex = /(?:cek status|lacak)\s+laporan\s+(?:id\s+)?([A-Z0-9-]+)|(?:id\s+)(SKL-[A-Z0-9-]+)/i;
    let match = lowerMsg.match(statusCheckRegex);
    if (!match && lowerMsg.startsWith('cek status untuk id laporan:')) {
         const idFromForm = cleanMessage.split(':')[1]?.trim();
         match = [idFromForm, idFromForm];
    }

    if (match) {
        const reportId = (match[1] || match[2]).trim();
        if (reportId.length < 3) return null;

        const reports = db.getTable('pengaduan_kerusakan');
        const foundReport = reports.find(r => r.id.toUpperCase() === reportId.toUpperCase());
        
        if (foundReport) {
            const statusReport: LaporanStatus = {
                type: 'laporan_status',
                id_laporan: foundReport.id,
                deskripsi_laporan: foundReport.deskripsi_masalah,
                status_laporan: foundReport.status,
                catatan_status: foundReport.status === "Pending"
                    ? "Laporan telah diterima dan sedang menunggu verifikasi dari tim administrasi."
                    : `Laporan sedang ditangani. Status terakhir: ${foundReport.status}.`,
                tanggal_update: new Date(foundReport.tanggal_lapor).toLocaleString('id-ID')
            };
            return { text: `Baik, *${user.nama_lengkap}*. Berikut status terbaru untuk laporan *${reportId}*:\n:::DATA_JSON:::${JSON.stringify(statusReport)}` };
        } else {
            return { text: `Maaf, laporan dengan ID *${reportId}* tidak dapat ditemukan di database kami. Pastikan ID yang Anda masukkan benar.` };
        }
    }

    // Handler 3: Status Server / IT Inventory
    if (lowerMsg.includes("cek inventaris kategori 'server' & 'jaringan'") || (lowerMsg.includes("inventaris") && lowerMsg.includes("jaringan"))) {
        const inventaris = db.getTable('inventaris');
        const itItems = inventaris.filter(i => 
            i.kategori === 'IT' && 
            (i.nama_barang.toLowerCase().includes('server') || i.nama_barang.toLowerCase().includes('wifi') || i.nama_barang.toLowerCase().includes('router') || i.nama_barang.toLowerCase().includes('jaringan'))
        );
        
        if (itItems.length > 0) {
            return { text: `🖥️ **Status Infrastruktur IT (Server & Jaringan)**\n:::DATA_JSON:::${JSON.stringify(itItems)}` };
        }
        return { text: "Tidak ditemukan aset kategori Server atau Jaringan di database." };
    }

    // Handler 4: Aset Rusak (IT/Sarpras)
    if (lowerMsg.includes("query inventaris yang statusnya 'rusak") || lowerMsg.includes("rekomendasi peremajaan")) {
        const inventaris = db.getTable('inventaris');
        const damagedItems = inventaris.filter(i => i.status_barang === 'Rusak Berat' || i.status_barang === 'Rusak Ringan');
        
        if (damagedItems.length > 0) {
             const formatted = damagedItems.map(i => ({
                 ID: i.id_barang,
                 Nama: i.nama_barang,
                 Kategori: i.kategori,
                 Status: i.status_barang,
                 Lokasi: i.id_lokasi
             }));
             return { text: `⚠️ **Daftar Aset Bermasalah**\nBerikut adalah aset yang memerlukan perhatian atau peremajaan:\n:::DATA_JSON:::${JSON.stringify(formatted)}` };
        }
        return { text: "🎉 **Bagus!** Tidak ada aset yang tercatat dalam kondisi Rusak saat ini." };
    }

    // RULE 0: Handle Update Status (Explicit Command from Buttons)
    const updateStatusRegex = /(?:perbarui|ubah|ganti)\s+status\s+(?:laporan\s+)?([A-Z0-9-]+)\s+menjadi\s+(\w+)/i;
    const updateMatch = lowerMsg.match(updateStatusRegex);
    
    if (updateMatch && updateMatch[1] && updateMatch[2]) {
        const allowedRoles = ['penanggung_jawab', 'admin'];
        if (!allowedRoles.includes(user.peran)) {
            return { 
                text: `⛔ *Akses Ditolak*\n\nMaaf, peran Anda sebagai **${user.peran.replace('_', ' ').toUpperCase()}** hanya memiliki akses pengawasan (monitoring).\n\nAnda tidak memiliki izin untuk mengubah status laporan. Silakan hubungi **Penanggung Jawab** untuk melakukan eksekusi perbaikan.` 
            };
        }

        const reportId = updateMatch[1].trim();
        const newStatusRaw = updateMatch[2].trim();
        let newStatus: 'Pending' | 'Proses' | 'Selesai' | null = null;
        if (newStatusRaw.match(/proses|diproses/i)) newStatus = 'Proses';
        else if (newStatusRaw.match(/selesai|beres|tuntas/i)) newStatus = 'Selesai';
        else if (newStatusRaw.match(/pending|tunda/i)) newStatus = 'Pending';
        
        if (newStatus) {
            const reports = db.getTable('pengaduan_kerusakan');
            const reportIndex = reports.findIndex(r => r.id.toUpperCase() === reportId.toUpperCase());
            
            if (reportIndex !== -1) {
                const updatedReport = { ...reports[reportIndex], status: newStatus };
                const dataToSave: SavedData = { table: 'pengaduan_kerusakan', payload: updatedReport };
                return {
                    text: `✅ *Status Diperbarui*\n\nStatus laporan *${reportId}* berhasil diubah menjadi **${newStatus}**.\nSistem telah memperbarui database dan menotifikasi pelapor.`,
                    dataToSave
                };
            } else {
                return { text: `❌ *Gagal Update*\nLaporan dengan ID *${reportId}* tidak ditemukan.` };
            }
        }
    }

    // RULE 0.1: Handle General "Update Status" Request
    if (lowerMsg.includes('ingin update status') || lowerMsg.includes('ingin mengubah status')) {
        const allowedRoles = ['penanggung_jawab', 'admin'];
        if (!allowedRoles.includes(user.peran)) {
             return { text: `⛔ *Menu Terbatas*\n\nFitur pembaruan status hanya tersedia untuk **Penanggung Jawab**. Sebagai Pengawas, Anda dapat menanyakan status terkini kepada saya.` };
        }

        const reports = db.getTable('pengaduan_kerusakan');
        const activeReports = reports.filter(r => r.status !== 'Selesai').sort((a,b) => b.tanggal_lapor.getTime() - a.tanggal_lapor.getTime());
        
        if (activeReports.length === 0) return { text: "Saat ini tidak ada laporan aktif yang memerlukan pembaruan status (semua sudah Selesai)." };

        const reportList = activeReports.slice(0, 5).map(r => `- **${r.id}**: ${r.nama_barang} (Status Saat Ini: ${r.status})`).join('\n');
        const exampleId = activeReports[0].id;
        return {
            text: `Untuk memperbarui status, Anda perlu menyebutkan ID laporan dan status tujuannya.\n\nSilakan ketik perintah dengan format berikut:\n👉 "**Perbarui status laporan ${exampleId} menjadi Proses**"\n👉 "**Perbarui status laporan ${exampleId} menjadi Selesai**"\n\nBerikut daftar laporan aktif yang bisa Anda update:\n${reportList}`
        };
    }

    // RULE 1: Handle Report Creation from free text (Tamu only or simplified reporting)
    if (user.peran === 'tamu' && (lowerMsg.includes('sampah') || lowerMsg.includes('kacau') || lowerMsg.includes('rusak') || lowerMsg.includes('berserakan'))) {
        const newReportId = generateReportId(user);
        const newReport: PengaduanKerusakan = {
            id: newReportId,
            id_barang: 'UMUM-01',
            id_pengadu: user.id_pengguna,
            tanggal_lapor: new Date(),
            deskripsi_masalah: message,
            status: 'Pending',
            kategori_aset: 'General',
            nama_barang: 'Masalah Kebersihan/Umum',
            nama_pengadu: user.nama_lengkap,
            lokasi_kerusakan: 'Berbagai Lokasi (dilaporkan oleh pengguna)'
        };
        const dataToSave: SavedData = { table: 'pengaduan_kerusakan', payload: newReport };
        return {
            text: `✅ *Laporan Diterima!*\n\nTerima kasih, laporan Anda telah kami catat. Tim terkait akan segera menindaklanjuti.\n\n*ID Laporan Anda: ${newReportId}*\n\nAnda dapat menggunakan ID ini untuk mengecek status laporan.`,
            dataToSave
        };
    }
    
    // RULE 3: Handle "Tampilkan riwayat dan detail teknis"
    const detailRegex = /tampilkan riwayat dan detail teknis untuk id\s+([A-Z0-9-]+)/i;
    match = lowerMsg.match(detailRegex);
    if(match && match[1]) {
        const itemId = match[1].toUpperCase();
        const inventaris = db.getTable('inventaris');
        const item = inventaris.find(i => i.id_barang.toUpperCase() === itemId);

        if (item) {
             const report: DetailedItemReport = {
                type: 'detailed_item_report',
                id_inventaris: item.id_barang,
                nama_barang: item.nama_barang,
                status_barang: item.status_barang,
                riwayat_kerusakan: {
                    items: db.getTable('pengaduan_kerusakan').filter(r => r.id_barang === item.id_barang)
                },
                catatan_teknis: { items: [{ tanggal: new Date().toLocaleDateString(), deskripsi: 'Pengecekan rutin dilakukan.' }] },
                riwayat_peminjaman: { items: db.getTable('peminjaman_antrian').filter(p => p.id_barang === item.id_barang) }
            };
            return { text: `Berikut adalah detail komprehensif untuk *${item.nama_barang}* (ID: ${item.id_barang}):\n:::DATA_JSON:::${JSON.stringify(report)}` };
        } else {
             return { text: `Maaf, aset dengan ID *${itemId}* tidak ditemukan di database inventaris.` };
        }
    }
    
    // RULE 4: Generic Fallback for Inventory
    const inventoryKeywords = /(cek|cari|lihat|tampilkan|status|info)\s+.*(inventaris|aset|barang|server|jaringan|wifi|komputer|laptop|proyektor)/i;
    if (lowerMsg.match(inventoryKeywords)) {
        const inventaris = db.getTable('inventaris');
        const locations = db.getTable('lokasi');
        let filtered = inventaris;
        
        if (lowerMsg.includes('server')) filtered = filtered.filter(i => i.nama_barang.toLowerCase().includes('server'));
        else if (lowerMsg.match(/(jaringan|wifi)/)) filtered = filtered.filter(i => i.nama_barang.toLowerCase().match(/(wifi|jaringan|router|access point)/));
        else if (lowerMsg.includes('it')) filtered = filtered.filter(i => i.kategori === 'IT');
        else if (lowerMsg.includes('sarpras')) filtered = filtered.filter(i => i.kategori === 'Sarpras');
        
        if (filtered.length === 0 && !lowerMsg.match(/(server|jaringan|wifi)/)) {
             filtered = inventaris.slice(0, 5);
        }

        if (filtered.length > 0) {
            const list = filtered.slice(0, 5).map(i => {
                const locName = locations.find(l => l.id_lokasi === i.id_lokasi)?.nama_lokasi || i.id_lokasi;
                return `- **${i.nama_barang}** (${i.kategori}): Status *${i.status_barang}* @ ${locName}`;
            }).join('\n');
            return { text: `📂 **Hasil Pencarian Inventaris (Simulasi):**\n\n${list}\n\n_(Menampilkan maks. 5 data)_` };
        }
        return { text: "Data inventaris tidak ditemukan untuk kriteria tersebut." };
    }
    
    // RULE 5: Handle Basic Analysis (Simulation fallback)
    if (lowerMsg.match(/(analisis|kesimpulan|rangkuman|statistik)/) && lowerMsg.match(/(kerusakan|log|laporan)/)) {
        const reports = db.getTable('pengaduan_kerusakan');
        const total = reports.length;
        const itCount = reports.filter(r => r.kategori_aset === 'IT').length;
        const pendingCount = reports.filter(r => r.status === 'Pending').length;
        
        return {
            text: `📊 **Analisis Kerusakan (Mode Offline)**\n\nBerdasarkan data database saat ini:\n\n- **Total Laporan:** ${total}\n- **Kategori IT:** ${itCount}\n- **Status Pending:** ${pendingCount}\n\n*Catatan: Analisis mendalam memerlukan konfigurasi API Key.*`
        };
    }

    return null;
}


export const sendMessageToGemini = async (message: string, user: User, imageBase64?: string | null, mimeType?: string | null): Promise<GeminiResponse> => {
 
  // 1. Coba jalankan simulasi dulu (untuk respon cepat/tugas sederhana/fallback/hemat kuota)
  const simulationResult = runSimulation(message, user);
  if (simulationResult) {
    return new Promise(resolve => setTimeout(() => resolve(simulationResult), 500));
  }

  // 2. Jika tidak tertangani simulasi, kirim ke Real AI
  if (!ai) {
    return { text: `⚠️ **Konfigurasi Diperlukan**\n\nFitur ini memerlukan **Google Gemini API Key**.\n\nAPI Key tidak ditemukan dalam konfigurasi lingkungan (environment variable). Silakan hubungi administrator.\n\n_Pesan error debug: API Key missing in process.env_`};
  }
  
  // Setup Variables for Request
  let systemInstruction = `Anda adalah asisten AI untuk sistem SIKILAT (Sistem Informasi Kilat & Manajemen Aset). 
    Peran pengguna saat ini: ${user.peran} (${user.nama_lengkap}).
    Jawablah dengan profesional, ringkas, dan membantu. Gunakan format Markdown.`;

  let userPrompt = message;
  let modelName = 'gemini-2.5-flash';
  let generationConfig: any = { systemInstruction };
  
  // --- CONTEXT INJECTION: ANALISIS (USING GEMINI 2.0 FLASH THINKING) ---
  if (message.toLowerCase().match(/(kesimpulan|analisis|rangkuman|kinerja|strategis|rekomendasi|prediksi)/)) {
      const inventaris = db.getTable('inventaris');
      const reports = db.getTable('pengaduan_kerusakan');
      const bookings = db.getTable('peminjaman_antrian');
      
      const totalAset = inventaris.length;
      const asetRusakBerat = inventaris.filter(i => i.status_barang === 'Rusak Berat').length;
      const asetRusakRingan = inventaris.filter(i => i.status_barang === 'Rusak Ringan').length;
      const asetBaik = inventaris.filter(i => i.status_barang === 'Baik').length;
      
      const laporanPending = reports.filter(r => r.status === 'Pending').length;
      const laporanProses = reports.filter(r => r.status === 'Proses').length;
      const laporanSelesai = reports.filter(r => r.status === 'Selesai').length;
      
      const recentReports = reports
          .slice(0, 5)
          .map(r => `- [${r.tanggal_lapor.toLocaleDateString()}] ${r.nama_barang} di ${r.lokasi_kerusakan}: ${r.deskripsi_masalah} (Status: ${r.status})`)
          .join('\n');

      const contextData = `
      [DATA STATISTIK SISTEM REAL-TIME]
      - Total Aset: ${totalAset} (Baik: ${asetBaik}, Rusak: ${asetRusakRingan + asetRusakBerat})
      - Tiket Pending: ${laporanPending}, Proses: ${laporanProses}, Selesai: ${laporanSelesai}
      - Total Peminjaman: ${bookings.length}
      - Laporan Terakhir:
      ${recentReports}
      
      Instruksi: Berikan analisis manajerial dan rekomendasi strategis mengenai kesimpulan kinerja penanganan laporan dan kondisi aset saat ini berdasarkan data di atas.`;
      
      userPrompt = `${userPrompt}\n\n${contextData}`;

      // USE THINKING MODEL FOR COMPLEX TASKS
      modelName = 'gemini-3-pro-preview';
      generationConfig = {
          systemInstruction,
          thinkingConfig: { thinkingBudget: 32768 } // max budget for pro
      };
  }

  // --- CONTEXT INJECTION: KONTAK ADMIN/PETUGAS ---
  if (message.toLowerCase().match(/(kontak|hubungi|telepon|email|admin|petugas)/)) {
      const allUsers = db.getTable('pengguna');
      const officialContacts = allUsers.filter(u => 
          ['admin', 'pengawas_admin', 'pengawas_it', 'pengawas_sarpras', 'penanggung_jawab'].includes(u.peran)
      );

      const contactList = officialContacts.map(u => 
          `- ${u.nama_lengkap} (${u.peran.replace('_', ' ').toUpperCase()}): ${u.no_hp} | ${u.email}`
      ).join('\n');

      const contactContext = `
      [DATA KONTAK PETUGAS RESMI SIKILAT]
      Berikut adalah daftar kontak petugas yang BISA diberikan kepada pengguna jika diminta:
      ${contactList}

      Instruksi: User meminta kontak. Berikan informasi kontak di atas dengan format yang rapi dan mudah dibaca. JANGAN menolak memberikan informasi ini karena ini adalah data publik layanan.
      `;

      userPrompt = `${userPrompt}\n\n${contactContext}`;
  }

  let parts: any[] = [{ text: userPrompt }];

  if (imageBase64 && mimeType) {
      parts.push({
          inlineData: {
              data: imageBase64,
              mimeType: mimeType
          }
      });
  }

  try {
    const response = await ai.models.generateContent({
        model: modelName,
        config: generationConfig,
        contents: [{ parts: parts }],
    });
    
    return { text: response.text || "Maaf, saya tidak dapat memproses permintaan saat ini." };

  } catch (error: any) {
    console.error("Gemini API Error:", error);

    // --- HANDLE QUOTA EXCEEDED (429) GRACEFULLY ---
    const errorMsg = error.message || JSON.stringify(error);
    if (errorMsg.includes('429') || errorMsg.includes('Quota exceeded') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
         return {
            text: `⚠️ **Kuota AI Habis (Limit Harian Tercapai)**\n\nMaaf, kuota penggunaan AI (Gemini Free Tier) untuk hari ini telah habis.\n\n**Solusi:**\n1. Gunakan fitur **Input Formulir** (tetap berjalan normal karena diproses Offline).\n2. Coba lagi besok saat kuota direset.\n3. Hubungi admin untuk upgrade ke akun berbayar jika ini sering terjadi.`
         }
    }

    // --- ROBUST FALLBACK FOR OVERLOADED API (503) OR NETWORK ISSUES ---
    if (message.toLowerCase().match(/(kesimpulan|analisis|rangkuman|kinerja|strategis|rekomendasi|prediksi)/)) {
        const reports = db.getTable('pengaduan_kerusakan');
        const total = reports.length;
        const pending = reports.filter(r => r.status === 'Pending').length;
        const itCount = reports.filter(r => r.kategori_aset === 'IT').length;
        const sarprasCount = reports.filter(r => r.kategori_aset === 'Sarpras').length;
        const dominantCat = itCount > sarprasCount ? 'IT' : 'Sarpras';

        return {
            text: `⚠️ **AI Sedang Sibuk (Mode Offline)**\n\nKoneksi ke model AI mengalami gangguan. Namun, sistem tetap dapat menyajikan **Analisis Statistik Lokal** untuk Anda:\n\n### 📊 Ringkasan Data Real-time\n- **Total Laporan:** ${total} tiket tercatat.\n- **Perhatian Khusus:** Terdapat **${pending} tiket Pending** yang membutuhkan tindakan segera.\n- **Dominasi Masalah:** Kategori **${dominantCat}** memiliki frekuensi laporan tertinggi bulan ini.\n\n### 💡 Rekomendasi Tindakan (Auto-Generated)\n1. Prioritaskan penyelesaian tiket dengan status 'Pending'.\n2. Lakukan pengecekan stok suku cadang untuk aset kategori ${dominantCat}.\n\n_Sistem beralih ke mode statistik internal._`
        };
    }

    // --- FALLBACK MECHANISM FOR OTHER REQUESTS ---
    if (modelName === 'gemini-3-pro-preview') {
        console.warn("⚠️ Falling back to gemini-2.5-flash due to error...");
        try {
            const fallbackResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash', 
                config: { systemInstruction }, // Reset config
                contents: [{ parts: parts }],
            });
            return { text: fallbackResponse.text || "Maaf, respon kosong." };
        } catch (fallbackError: any) {
             console.error("Fallback Failed:", fallbackError);
             return { 
                text: `⚠️ *Gagal Terhubung ke AI*\n\nTerjadi kesalahan pada model utama dan model cadangan.\n\n**Detail Error:** _${fallbackError.message || 'Unknown Error'}_` 
            };
        }
    }

    return { 
        text: `⚠️ *Gagal Terhubung ke AI*\n\nSistem menolak permintaan Anda. Kemungkinan penyebab:\n\n1. **API Key Tidak Valid/Missing.**\n2. **Koneksi Bermasalah:** Periksa internet Anda.\n\n**Pesan Error Asli:**\n_${error.message || JSON.stringify(error)}_` 
    };
  }
};
